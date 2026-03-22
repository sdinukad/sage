/**
 * Sage Local AI Engine
 *
 * Replaces Gemini API calls with:
 *   1. Regex pre-pass for obvious patterns
 *   2. ONNX DistilBERT intent classifier
 *   3. Regex entity extraction (amount, category, date, note)
 *   4. Template response generation
 *
 * Returns the same ChatResponse interface the frontend expects.
 */

import { ChatResponse, ChatAction, Expense, Income } from './models';
import * as ort from 'onnxruntime-node';
import * as fs from 'fs';
import * as path from 'path';
import { wordsToNumbers } from 'words-to-numbers';
import { AICategory } from './models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IntentLabel = 'add_expense' | 'add_income' | 'query' | 'edit_expense' | 'edit_income';

interface ExtractedEntities {
    amount?: number;
    category?: string;
    note?: string;
    date?: string;
}

interface TokenizerVocab {
    [token: string]: number;
}

// ---------------------------------------------------------------------------
// Model Loading (singleton)
// ---------------------------------------------------------------------------

let _session: ort.InferenceSession | null = null;
let _vocab: TokenizerVocab | null = null;
let _labelMap: Record<string, string> | null = null;

const MODEL_DIR = path.join(process.cwd(), 'models', 'sage-intent');

async function getSession(): Promise<ort.InferenceSession> {
    if (!_session) {
        const modelPath = path.join(MODEL_DIR, 'model.onnx');
        _session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['cpu'],
        });
        console.log('[LocalAI] ONNX model loaded');
    }
    return _session;
}

function getVocab(): TokenizerVocab {
    if (!_vocab) {
        const tokenizerPath = path.join(MODEL_DIR, 'tokenizer.json');
        const tokenizerData = JSON.parse(fs.readFileSync(tokenizerPath, 'utf-8'));
        _vocab = tokenizerData.model?.vocab || {};
        console.log(`[LocalAI] Tokenizer loaded (${Object.keys(_vocab!).length} tokens)`);
    }
    return _vocab!;
}

function getLabelMap(): Record<string, string> {
    if (!_labelMap) {
        const labelMapPath = path.join(MODEL_DIR, 'label_map.json');
        const data = JSON.parse(fs.readFileSync(labelMapPath, 'utf-8'));
        _labelMap = data.id2label;
        console.log('[LocalAI] Label map loaded:', _labelMap);
    }
    return _labelMap!;
}

// ---------------------------------------------------------------------------
// Tokenizer (WordPiece, matches DistilBERT)
// ---------------------------------------------------------------------------

function wordPieceTokenize(text: string, vocab: TokenizerVocab, maxLen: number = 64): { inputIds: number[]; attentionMask: number[] } {
    const CLS = vocab['[CLS]'] ?? 101;
    const SEP = vocab['[SEP]'] ?? 102;
    const PAD = vocab['[PAD]'] ?? 0;
    const UNK = vocab['[UNK]'] ?? 100;

    // Lowercase and basic cleanup
    const cleaned = text.toLowerCase().replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleaned.split(' ');

    const tokens: number[] = [CLS];

    for (const word of words) {
        let remaining = word;
        let isFirst = true;

        while (remaining.length > 0) {
            let matched = false;
            // Try longest match first
            for (let end = remaining.length; end > 0; end--) {
                const sub = isFirst ? remaining.slice(0, end) : `##${remaining.slice(0, end)}`;
                if (vocab[sub] !== undefined) {
                    tokens.push(vocab[sub]);
                    remaining = remaining.slice(end);
                    isFirst = false;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                tokens.push(UNK);
                remaining = remaining.slice(1);
                isFirst = false;
            }

            if (tokens.length >= maxLen - 1) break;
        }
        if (tokens.length >= maxLen - 1) break;
    }

    tokens.push(SEP);

    // Pad to maxLen
    const inputIds = tokens.slice(0, maxLen);
    const attentionMask = inputIds.map(() => 1);

    while (inputIds.length < maxLen) {
        inputIds.push(PAD);
        attentionMask.push(0);
    }

    return { inputIds, attentionMask };
}

// ---------------------------------------------------------------------------
// Intent Classification (ONNX inference)
// ---------------------------------------------------------------------------

async function classifyIntent(text: string): Promise<{ intent: IntentLabel; confidence: number }> {
    const session = await getSession();
    const vocab = getVocab();
    const labelMap = getLabelMap();

    const { inputIds, attentionMask } = wordPieceTokenize(text, vocab);

    const inputTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
    const maskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length]);
    const typeIdsTensor = new ort.Tensor('int64', new BigInt64Array(inputIds.length).fill(BigInt(0)), [1, inputIds.length]);

    const feeds: Record<string, ort.Tensor> = {
        input_ids: inputTensor,
        attention_mask: maskTensor,
        token_type_ids: typeIdsTensor,
    };

    const results = await session.run(feeds);
    const logits = results.logits?.data as Float32Array;

    // Softmax
    const maxLogit = Math.max(...Array.from(logits));
    const exps = Array.from(logits).map(l => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(e => e / sumExps);

    const maxIdx = probs.indexOf(Math.max(...probs));
    const intent = (labelMap[String(maxIdx)] || 'query') as IntentLabel;
    const confidence = probs[maxIdx];

    console.log(`[LocalAI] Intent: ${intent} (${(confidence * 100).toFixed(1)}%)`);

    return { intent, confidence };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLocalDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Entity Extraction (Regex-based)
// ---------------------------------------------------------------------------

function extractEntities(
    message: string,
    expenseCategories: AICategory[] = [],
    incomeCategories: AICategory[] = []
): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Amount extraction — match numbers with optional currency prefixes and "k" suffix
    // Negative lookahead prevents matching dates like "15th" or "15 march"
    const amountPattern = /(?:rs\.?\s*|lkr\s*|₨\s*)?\b(\d[\d,]*(?:\.\d{1,2})?)(?!\d)\s*(k\b|rupees?|rs|lkr|bucks?)?(?!\s*,?\s*(?:st|nd|rd|th|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b)/gi;
    const match = amountPattern.exec(message);
    if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        const suffix = (match[2] || '').toLowerCase();
        if (suffix === 'k') {
            amount *= 1000;
        } else if (!suffix && message.slice(match.index + match[0].length).trim().toLowerCase().startsWith('k')) {
            // Handle edge cases where "k" wasn't caught in group 2
            amount *= 1000;
        }
        entities.amount = amount;
    }

    // Date extraction
    const now = new Date();
    const datePatterns: [RegExp, () => string][] = [
        [/\btoday\b/i, () => toLocalDateString(now)],
        [/\byesterday\b/i, () => {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            return toLocalDateString(d);
        }],
        [/\b(\d+)\s*days?\s*ago\b/i, () => {
            const m = message.match(/(\d+)\s*days?\s*ago/i);
            const d = new Date(now);
            d.setDate(d.getDate() - parseInt(m![1]));
            return toLocalDateString(d);
        }],
        [/\blast\s*week\b/i, () => {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            return toLocalDateString(d);
        }],
        [/\bthis\s*morning\b/i, () => toLocalDateString(now)],
        [/\bearlier\s*today\b/i, () => toLocalDateString(now)],
        [/\bon\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, () => {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const m = message.match(/on\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
            const targetDay = dayNames.indexOf(m![1].toLowerCase());
            const d = new Date(now);
            const diff = (d.getDay() - targetDay + 7) % 7 || 7;
            d.setDate(d.getDate() - diff);
            return toLocalDateString(d);
        }],
        [/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/i, () => {
            const monthNames: Record<string, number> = {
                jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
                apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
                aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
                nov: 10, november: 10, dec: 11, december: 11,
            };
            const m = message.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i);
            if (m) {
                const month = monthNames[m[1].toLowerCase()];
                const day = parseInt(m[2]);
                const d = new Date(now.getFullYear(), month, day);
                return toLocalDateString(d);
            }
            return toLocalDateString(now);
        }],
        [/\bon\s*the\s*(\d{1,2})(?:st|nd|rd|th)?\b/i, () => {
            const m = message.match(/on\s*the\s*(\d{1,2})/i);
            const d = new Date(now.getFullYear(), now.getMonth(), parseInt(m![1]));
            return toLocalDateString(d);
        }],
        [/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i, () => {
            const monthNames: Record<string, number> = {
                jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
                apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
                aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
                nov: 10, november: 10, dec: 11, december: 11,
            };
            const m = message.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
            if (m) {
                const day = parseInt(m[1]);
                const month = monthNames[m[2].toLowerCase()];
                const d = new Date(now.getFullYear(), month, day);
                return toLocalDateString(d);
            }
            return toLocalDateString(now);
        }],
    ];

    for (const [pattern, dateGen] of datePatterns) {
        if (pattern.test(message)) {
            entities.date = dateGen();
            break;
        }
    }

    if (!entities.date) {
        entities.date = toLocalDateString(now);
    }

    // Category extraction — fuzzy match against user's categories
    const allCategories = [...expenseCategories, ...incomeCategories];
    const defaultExpenseCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Shopping', 'Other'];
    const defaultIncomeCategories = ['Salary', 'Bonus', 'Investment', 'Gift', 'Freelance', 'Other'];
    const searchCategories = allCategories.length > 0 ? allCategories.map(c => c.name) : [...defaultExpenseCategories, ...defaultIncomeCategories];

    const messageLower = message.toLowerCase();
    for (const cat of searchCategories) {
        if (messageLower.includes(cat.toLowerCase())) {
            entities.category = cat;
            break;
        }
    }

    // Note extraction — whatever's left after removing amount, date, category
    let noteText = message;
    // Remove amounts
    noteText = noteText.replace(/(?:rs\.?\s*|lkr\s*|₨\s*)?\d[\d,]*(?:\.\d{1,2})?\s*(?:rupees?|rs|lkr|bucks?|k\b)?/gi, '');
    // Remove date references
    noteText = noteText.replace(/\b(?:today|yesterday|last\s*(?:week|month)|this\s*morning|earlier\s*today|\d+\s*days?\s*ago|on\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{1,2}|on\s*the\s*\d{1,2}(?:st|nd|rd|th)?)\b/gi, '');
    // Remove common verbs / filler
    noteText = noteText.replace(/\b(?:spent|paid|bought|had|cost|was|for|on|add|log|record|new|expense|income|i|just|about|dropped|blew|charged|used|got|received|earned|my)\b/gi, '');
    // Remove extra whitespace
    noteText = noteText.replace(/\s+/g, ' ').trim();

    if (noteText.length > 1) {
        entities.note = noteText.charAt(0).toUpperCase() + noteText.slice(1);
    }

    // If we found a category in the text, prefer that as note if no other note
    if (!entities.note && entities.category) {
        entities.note = entities.category;
    }

    return entities;
}

// ---------------------------------------------------------------------------
// Category Classification (Dynamic Hint Matching)
// ---------------------------------------------------------------------------

export function classifyCategory(text: string, userCategories: AICategory[] = []): string {
    const textLower = text.toLowerCase();

    // Dynamically build keywords from user's custom hints
    const categoryKeywords: Record<string, string[]> = {};
    
    if (userCategories.length > 0) {
        userCategories.forEach(c => {
            const hints = c.hints ? c.hints.toLowerCase().split(',').map(s => s.trim()) : [];
            categoryKeywords[c.name] = [...hints, c.name.toLowerCase()];
        });
    } else {
        // Fallback backward compatibility map
        categoryKeywords['Food'] = ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'takeaway', 'delivery', 'pizza', 'burger', 'rice', 'kottu', 'string hoppers', 'snacks', 'coffee', 'cafe', 'meal', 'eat'];
        categoryKeywords['Transport'] = ['uber', 'grab', 'taxi', 'bus', 'train', 'fuel', 'petrol', 'gas', 'parking', 'toll', 'transport', 'ride', 'commute', 'drive'];
        categoryKeywords['Bills'] = ['bill', 'electricity', 'water', 'internet', 'phone', 'rent', 'insurance', 'subscription', 'netflix', 'spotify'];
        categoryKeywords['Entertainment'] = ['movie', 'cinema', 'game', 'gaming', 'concert', 'party', 'outing', 'entertainment', 'fun'];
        categoryKeywords['Health'] = ['doctor', 'dentist', 'pharmacy', 'medicine', 'hospital', 'clinic', 'gym', 'health', 'medical'];
        categoryKeywords['Shopping'] = ['clothes', 'shoes', 'clothing', 'shop', 'mall', 'amazon', 'online', 'purchase', 'buy', 'bought', 'dress', 'fashion', 'outfit'];
        categoryKeywords['Groceries'] = ['grocery', 'groceries', 'supermarket', 'vegetables', 'fruits', 'market'];
    }

    // First check exact user's custom category names
    for (const cat of Object.keys(categoryKeywords)) {
        if (textLower.includes(cat.toLowerCase())) {
            return cat;
        }
    }

    // Then check all keywords/hints
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const kw of keywords) {
            if (textLower.includes(kw)) {
                return category;
            }
        }
    }

    return 'Other';
}

// ---------------------------------------------------------------------------
// Expense Matching (for edits and queries)
// ---------------------------------------------------------------------------

function matchExpenses(
    entities: ExtractedEntities,
    expenses: Expense[],
    intent: IntentLabel
): string[] {
    if (!expenses || expenses.length === 0) return [];

    const scored = expenses.map(exp => {
        let score = 0;

        // Amount match
        if (entities.amount && exp.amount) {
            if (Number(exp.amount) === entities.amount) score += 10;
            else if (Math.abs(Number(exp.amount) - entities.amount) / entities.amount < 0.1) score += 5;
        }

        // Category match
        if (entities.category && exp.category) {
            if (exp.category.toLowerCase() === entities.category.toLowerCase()) score += 8;
        }

        // Note match
        if (entities.note && exp.note) {
            const noteLower = entities.note.toLowerCase();
            const expNoteLower = exp.note.toLowerCase();
            if (expNoteLower.includes(noteLower) || noteLower.includes(expNoteLower)) score += 7;
        }

        // Date match
        if (entities.date && exp.date) {
            if (exp.date.startsWith(entities.date)) score += 6;
        }

        // Recency bonus (prefer recent expenses)
        const daysSince = (Date.now() - new Date(exp.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 1) score += 3;
        else if (daysSince < 7) score += 2;
        else if (daysSince < 30) score += 1;

        return { id: exp.id, score };
    });

    scored.sort((a, b) => b.score - a.score);

    if (intent === 'edit_expense') {
        // Return only the best match for edits
        return scored[0]?.score > 3 ? [scored[0].id] : [];
    }

    // For queries, return all reasonable matches
    return scored.filter(s => s.score > 2).slice(0, 10).map(s => s.id);
}

function matchIncomes(
    entities: ExtractedEntities,
    incomes: Income[]
): string[] {
    if (!incomes || incomes.length === 0) return [];

    const scored = incomes.map(inc => {
        let score = 0;
        if (entities.amount && Number(inc.amount) === entities.amount) score += 10;
        if (entities.category && inc.category?.toLowerCase() === entities.category.toLowerCase()) score += 8;
        if (entities.note && inc.note?.toLowerCase().includes(entities.note.toLowerCase())) score += 7;
        if (entities.date && inc.date?.startsWith(entities.date)) score += 6;
        return { id: inc.id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.score > 3 ? [scored[0].id] : [];
}

// ---------------------------------------------------------------------------
// Template Response Builder
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

function buildResponse(
    intent: IntentLabel,
    entities: ExtractedEntities,
    matchedIds: string[],
    expenses: Expense[],
    incomes: Income[]
): ChatResponse {
    const actions: ChatAction[] = [];
    let answer = '';

    switch (intent) {
        case 'add_expense': {
            const amount = entities.amount || 0;
            const category = entities.category || classifyCategory(entities.note || '');
            const note = entities.note || category;
            const date = entities.date || toLocalDateString(new Date());

            answer = `Got it! I'll log ${formatCurrency(amount)} for ${category}.`;
            actions.push({
                type: 'add_expense',
                data: {
                    newExpense: { amount, category, note, date },
                },
                confirmationText: `Add ${formatCurrency(amount)} expense for "${note}" (${category}) on ${formatDate(date)}?`,
            });
            break;
        }

        case 'add_income': {
            const amount = entities.amount || 0;
            const category = entities.category || 'Other';
            const note = entities.note || category;
            const date = entities.date || toLocalDateString(new Date());

            answer = `Great! I'll record ${formatCurrency(amount)} income from ${category}.`;
            actions.push({
                type: 'add_income',
                data: {
                    newIncome: { amount, category, note, date },
                },
                confirmationText: `Add ${formatCurrency(amount)} income "${note}" (${category}) on ${formatDate(date)}?`,
            });
            break;
        }

        case 'edit_expense': {
            if (matchedIds.length > 0) {
                const matched = expenses.find(e => e.id === matchedIds[0]);
                if (matched) {
                    const changes: Partial<Expense> = {};
                    if (entities.amount && entities.amount !== Number(matched.amount)) changes.amount = entities.amount;
                    if (entities.category && entities.category.toLowerCase() !== matched.category.toLowerCase()) changes.category = entities.category;
                    if (entities.date && entities.date !== matched.date) changes.date = entities.date;
                    // Note is often inferred aggressively, so we only update if user changed it. Usually we leave it alone if unchanged.
                    if (entities.note && entities.note.length > 2 && entities.note !== matched.note && entities.note !== matched.category) changes.note = entities.note;

                    const changeDesc = Object.entries(changes).map(([k, v]) =>
                        k === 'amount' ? `amount to ${formatCurrency(v as number)}` : `${k} to "${v}"`
                    ).join(', ');

                    answer = `Found the expense "${matched.note || matched.category}" (${formatCurrency(Number(matched.amount))}). I'll update it.`;
                    actions.push({
                        type: 'edit_expense',
                        data: {
                            editExpense: { id: matched.id, changes },
                        },
                        confirmationText: `Update "${matched.note || matched.category}" — change ${changeDesc}?`,
                    });
                } else {
                    answer = "I found a match but couldn't load the details. Could you be more specific?";
                }
            } else {
                answer = "I couldn't find the expense you're referring to. Could you be more specific about which expense to edit?";
            }
            break;
        }

        case 'edit_income': {
            if (matchedIds.length > 0) {
                const matched = incomes.find(i => i.id === matchedIds[0]);
                if (matched) {
                    const changes: Partial<Income> = {};
                    if (entities.amount && entities.amount !== Number(matched.amount)) changes.amount = entities.amount;
                    if (entities.category && entities.category.toLowerCase() !== matched.category.toLowerCase()) changes.category = entities.category;
                    if (entities.date && entities.date !== matched.date) changes.date = entities.date;

                    const changeDesc = Object.entries(changes).map(([k, v]) =>
                        k === 'amount' ? `amount to ${formatCurrency(v as number)}` : `${k} to "${v}"`
                    ).join(', ');

                    answer = `Found your ${matched.category || 'income'} of ${formatCurrency(Number(matched.amount))}. I'll update it.`;
                    actions.push({
                        type: 'edit_income',
                        data: {
                            editIncome: { id: matched.id, changes },
                        },
                        confirmationText: `Update ${matched.category || 'income'} — change ${changeDesc}?`,
                    });
                } else {
                    answer = "I found a match but couldn't load the details. Could you be more specific?";
                }
            } else {
                answer = "I couldn't find the income you're referring to. Could you be more specific?";
            }
            break;
        }

        case 'query': {
            const queryAnswer = buildQueryAnswer(entities, expenses, incomes);
            answer = queryAnswer.text;
            if (queryAnswer.matchedIds.length > 0) {
                actions.push({
                    type: 'query',
                    data: { matchedIds: queryAnswer.matchedIds },
                });
            }
            break;
        }
    }

    return { answer, actions };
}

// ---------------------------------------------------------------------------
// Query Handler
// ---------------------------------------------------------------------------

function buildQueryAnswer(
    entities: ExtractedEntities,
    expenses: Expense[],
    incomes: Income[]
): { text: string; matchedIds: string[] } {
    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const thisWeekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    const thisWeekStartStr = `${thisWeekStart.getFullYear()}-${String(thisWeekStart.getMonth() + 1).padStart(2, '0')}-${String(thisWeekStart.getDate()).padStart(2, '0')}`;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Determine time filter from original note/query text
    let filtered = expenses;
    let timeLabel = '';

    // Check if the query mentions categories
    if (entities.category) {
        filtered = expenses.filter(e => e.category?.toLowerCase() === entities.category!.toLowerCase());
        timeLabel = `for ${entities.category} `;
    }

    // Time-based filtering
    const noteAndCategory = (entities.note || '').toLowerCase() + ' ' + (entities.category || '').toLowerCase();
    if (noteAndCategory.includes('today')) {
        filtered = filtered.filter(e => e.date?.startsWith(todayStr));
        timeLabel += 'today';
    } else if (noteAndCategory.includes('this week') || noteAndCategory.includes('week')) {
        filtered = filtered.filter(e => e.date && e.date >= thisWeekStartStr);
        timeLabel += 'this week';
    } else if (noteAndCategory.includes('this month') || noteAndCategory.includes('month')) {
        filtered = filtered.filter(e => e.date && e.date >= thisMonthStart);
        timeLabel += 'this month';
    } else {
        filtered = filtered.filter(e => e.date && e.date >= thisMonthStart);
        if (!timeLabel) timeLabel = 'this month';
    }

    const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const count = filtered.length;
    const matchedIds = filtered.slice(0, 10).map(e => e.id);

    // Category breakdown
    const breakdown: Record<string, number> = {};
    filtered.forEach(e => {
        const cat = e.category || 'Other';
        breakdown[cat] = (breakdown[cat] || 0) + Number(e.amount || 0);
    });

    // Income totals
    const totalIncome = incomes
        .filter(i => i.date && i.date >= thisMonthStart)
        .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    let text = '';

    if (noteAndCategory.includes('balance') || noteAndCategory.includes('net') || noteAndCategory.includes('left') || noteAndCategory.includes('saving')) {
        const net = totalIncome - total;
        text = `This month: Income ${formatCurrency(totalIncome)} - Expenses ${formatCurrency(total)} = ${net >= 0 ? 'Surplus' : 'Deficit'} of ${formatCurrency(Math.abs(net))}.`;
    } else if (noteAndCategory.includes('income') || noteAndCategory.includes('earn')) {
        text = `Total income this month: ${formatCurrency(totalIncome)} from ${incomes.filter(i => i.date && i.date >= thisMonthStart).length} entries.`;
    } else if (noteAndCategory.includes('biggest') || noteAndCategory.includes('top') || noteAndCategory.includes('most')) {
        const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            text = `Your biggest category ${timeLabel}: ${sorted[0][0]} at ${formatCurrency(sorted[0][1])}`;
            if (sorted.length > 1) {
                text += `, followed by ${sorted[1][0]} (${formatCurrency(sorted[1][1])})`;
            }
            text += '.';
        } else {
            text = `No expenses found ${timeLabel}.`;
        }
    } else if (noteAndCategory.includes('breakdown') || noteAndCategory.includes('summary') || noteAndCategory.includes('trend')) {
        const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
        text = `Spending breakdown ${timeLabel} (${formatCurrency(total)} total):\n` +
            sorted.map(([cat, amt]) => `• ${cat}: ${formatCurrency(amt)}`).join('\n');
    } else if (noteAndCategory.includes('average') || noteAndCategory.includes('daily')) {
        const days = Math.max(1, Math.ceil((now.getTime() - new Date(thisMonthStart).getTime()) / (1000 * 60 * 60 * 24)));
        const avg = total / days;
        text = `Your daily average spending ${timeLabel}: ${formatCurrency(Math.round(avg))} (${formatCurrency(total)} over ${days} days).`;
    } else if (noteAndCategory.includes('recent') || noteAndCategory.includes('last') || noteAndCategory.includes('list') || noteAndCategory.includes('show') || noteAndCategory.includes('all') || noteAndCategory.includes('everything')) {
        text = `Here are your ${count > 10 ? 'most recent 10 of ' + count : count} expenses ${timeLabel} (${formatCurrency(total)} total):`;
    } else {
        // Default: total spending
        text = `You've spent ${formatCurrency(total)} ${timeLabel} across ${count} expense${count !== 1 ? 's' : ''}.`;
        if (Object.keys(breakdown).length > 0) {
            const top = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0];
            text += ` Top category: ${top[0]} (${formatCurrency(top[1])}).`;
        }
    }

    return { text, matchedIds };
}

// ---------------------------------------------------------------------------
// Regex Pre-pass (handles obvious patterns without ML)
// ---------------------------------------------------------------------------

function regexPrePass(text: string): IntentLabel | null {
    const lower = text.toLowerCase().trim();

    // Query patterns — check first since they don't contain amounts
    const queryPatterns = [
        /^how much/i, /^what('s| is|'s)? my/i, /^show/i, /^list/i, /^breakdown/i,
        /^summary/i, /^search/i, /^find/i, /^total/i, /^average/i, /^compare/i,
        /\bhow much did i/i, /\bwhere does my money/i, /\bhow much on\b/i,
        /\bhow much have i/i, /\bam i saving/i, /\bhow much left/i,
        /\bwhat's my balance/i, /\bspending trend/i,
    ];

    for (const p of queryPatterns) {
        if (p.test(lower)) return 'query';
    }

    // Edit patterns
    if (/^(?:change|update|edit|fix|modify|correct|move|recategorize)\b/i.test(lower)) {
        if (/\bincome\b|\bsalary\b|\bbonus\b|\bearning\b/i.test(lower)) return 'edit_income';
        return 'edit_expense';
    }
    if (/\bshould be\b|\bwas actually\b|\bnot \d/i.test(lower)) {
        if (/\bincome\b|\bsalary\b|\bbonus\b/i.test(lower)) return 'edit_income';
        return 'edit_expense';
    }

    // Income patterns
    if (/\b(?:got paid|received|earned|salary|paycheck|income|deposited|made|freelance|sold)\b/i.test(lower)) {
        return 'add_income';
    }

    // Expense patterns (if it has an amount and a spending verb)
    if (/\b(?:spent|paid|bought|cost|charge|dropped|blew|used|add|log|record)\b/i.test(lower) && /\d/.test(lower)) {
        return 'add_expense';
    }

    // Simple "amount + word" pattern (e.g., "500 food", "lunch 200")
    if (/^\w+\s+\d+$/.test(lower) || /^\d+\s+\w+$/.test(lower)) {
        return 'add_expense';
    }

    return null; // Ambiguous — defer to DistilBERT
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main chat processing function.
 * Drop-in replacement for processSageChat / processSageChatStream from gemini.ts.
 */
export async function processChat(
    message: string,
    expenses: Expense[],
    expenseCategories: AICategory[] = [],
    incomeCategories: AICategory[] = [],
    incomes: Income[] = []
): Promise<ChatResponse> {
    console.log(`[LocalAI] Processing original: "${message}"`);
    
    // Preprocess: convert number words to digits (e.g., "fifty thousand" -> 50000)
    const processedMessage = String(wordsToNumbers(message) || message);
    if (processedMessage !== message) {
        console.log(`[LocalAI] Preprocessed words-to-numbers: "${processedMessage}"`);
    }

    // Detect complex multi-part sentences
    const numDigitsFound = (processedMessage.match(/(?:\d[\d,]*(?:\.\d{1,2})?)/g) || []).length;
    const isComplex = /\b(?:and|also|plus|then)\b/i.test(processedMessage) && numDigitsFound >= 2;

    // Layer 1: Regex pre-pass
    let intent = regexPrePass(processedMessage);
    let confidence = 1.0;

    if (intent) {
        console.log(`[LocalAI] Regex pre-pass matched: ${intent}`);
    } else {
        // Layer 2: DistilBERT classification
        try {
            const result = await classifyIntent(processedMessage);
            intent = result.intent;
            confidence = result.confidence;

            // Confidence threshold check (rejection of out-of-domain queries)
            if (confidence < 0.45) {
                console.log(`[LocalAI] Low confidence (${(confidence * 100).toFixed(1)}%), rejecting intent: ${intent}`);
                return {
                    answer: "I'm a financial assistant. I didn't quite catch that—could you rephrase it as an expense, income, or question about your spending?",
                    actions: [],
                    confidence
                };
            }
        } catch (err) {
            console.error('[LocalAI] ONNX inference failed, falling back to regex:', err);
            // Ultimate fallback: guess from entities
            intent = message.match(/\d/) ? 'add_expense' : 'query';
            confidence = 0.5;
        }
    }

    // Layer 3: Entity extraction
    const entities = extractEntities(processedMessage, expenseCategories, incomeCategories);
    console.log(`[LocalAI] Entities:`, entities);

    // Layer 4: Match expenses/incomes for edits and queries
    let matchedIds: string[] = [];
    if (intent === 'edit_expense' || intent === 'query') {
        matchedIds = matchExpenses(entities, expenses, intent);
    } else if (intent === 'edit_income') {
        matchedIds = matchIncomes(entities, incomes);
    }

    // Layer 5: Build response
    const response = buildResponse(intent, entities, matchedIds, expenses, incomes);

    if (isComplex) {
      console.log(`[LocalAI] Complex multi-intent detected, lowering confidence to 0.40 to trigger Gemini fallback.`);
      confidence = 0.40;
    }

    console.log(`[LocalAI] Response: intent=${intent}, confidence=${(confidence * 100).toFixed(1)}%, actions=${response.actions.length}`);
    return { ...response, confidence };
}

/**
 * Simple expense edit intent processor.
 * Drop-in replacement for the edit-intent route.
 */
export async function processEditIntent(
    message: string,
    expenses: Expense[]
): Promise<{ expenseId: string | null; changes: Partial<Expense>; confirmationText: string }> {
    const entities = extractEntities(message);
    const matches = matchExpenses(entities, expenses, 'edit_expense');

    if (matches.length === 0) {
        return {
            expenseId: null,
            changes: {},
            confirmationText: "I couldn't find the expense you're referring to.",
        };
    }

    const matched = expenses.find(e => e.id === matches[0])!;
    const changes: Partial<Expense> = {};
    if (entities.amount) changes.amount = entities.amount;
    if (entities.category) changes.category = entities.category;
    if (entities.note) changes.note = entities.note;
    if (entities.date) changes.date = entities.date;

    const changeDesc = Object.entries(changes).map(([k, v]) =>
        k === 'amount' ? `amount to ${formatCurrency(v as number)}` : `${k} to "${v}"`
    ).join(', ');

    return {
        expenseId: matched.id,
        changes,
        confirmationText: `Update "${matched.note || matched.category}" — change ${changeDesc}?`,
    };
}

/**
 * Simple expense query processor.
 * Drop-in replacement for the query route.
 */
export async function processQuery(
    query: string,
    expenses: Expense[]
): Promise<{ answer: string; matchedIds: string[] }> {
    const entities = extractEntities(query);
    const result = buildQueryAnswer(entities, expenses, []);
    return { answer: result.text, matchedIds: result.matchedIds };
}
