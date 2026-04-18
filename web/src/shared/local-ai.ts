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

import { ChatResponse, ChatAction, Expense, Income, getRecurringSchedule, ChatMessage } from './models';
import * as ort from 'onnxruntime-node';
import * as fs from 'fs';
import * as path from 'path';
import { wordsToNumbers } from 'words-to-numbers';
import { AICategory } from './models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IntentLabel = 'add_expense' | 'add_income' | 'add_recurring' | 'query' | 'edit_expense' | 'edit_income' | 'edit_recurring';

export interface ExtractedEntities {
    amount?: number;
    currency?: string;
    category?: string;
    note?: string;
    date?: string;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    day_of_week?: number;
    day_of_month?: number;
    month_of_year?: number;
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

async function getInferenceSession(): Promise<ort.InferenceSession> {
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
    const session = await getInferenceSession();
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

function mapToCurrencyCode(token: string): string | null {
    if (!token) return null;
    const t = token.toUpperCase().trim().replace(/\.$/, '');
    if (t === '$' || t === 'USD') return 'USD';
    if (t === '€' || t === 'EUR') return 'EUR';
    if (t === '£' || t === 'GBP') return 'GBP';
    if (t === '¥' || t === 'JPY') return 'JPY';
    if (t === 'RS' || t === 'RS.' || t === '₨' || t === 'LKR' || t === 'RUPEES') return 'LKR';
    const commonCurrencies = ['USD', 'LKR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'SGD', 'AED', 'SAR', 'QAR', 'CHF', 'CNY', 'THB', 'MYR', 'KRW', 'NZD'];
    if (commonCurrencies.includes(t)) return t;
    return null;
}

export function extractEntities(
    message: string,
    expenseCategories: AICategory[] = [],
    incomeCategories: AICategory[] = []
): ExtractedEntities {
    const entities: ExtractedEntities = {};
    const now = new Date();
    const messageLower = message.toLowerCase();

    // 1. Frequency and Recurring Info (Masked later)
    const freqPatterns: [RegExp, 'daily' | 'weekly' | 'monthly' | 'yearly'][] = [
        [/\bevery\s+day\b/i, 'daily'],
        [/\bdaily\b/i, 'daily'],
        [/\bevery\s+week\b/i, 'weekly'],
        [/\bweekly\b/i, 'weekly'],
        [/\bevery\s+month\b/i, 'monthly'],
        [/\bmonthly\b/i, 'monthly'],
        [/\bevery\s+year\b/i, 'yearly'],
        [/\byearly\b/i, 'yearly'],
    ];

    for (const [pattern, freq] of freqPatterns) {
        if (pattern.test(message)) {
            entities.frequency = freq;
            break;
        }
    }

    const intervalMatch = /\bevery\s+(\d+)\s+(days?|weeks?|months?|years?)\b/i.exec(message);
    if (intervalMatch) {
        entities.interval = parseInt(intervalMatch[1]);
        const unit = intervalMatch[2].toLowerCase();
        if (unit.startsWith('day')) entities.frequency = 'daily';
        else if (unit.startsWith('week')) entities.frequency = 'weekly';
        else if (unit.startsWith('month')) entities.frequency = 'monthly';
        else if (unit.startsWith('year')) entities.frequency = 'yearly';
    }

    const dowMatch = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/i.exec(message);
    if (dowMatch) {
        const dows: Record<string, number> = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6
        };
        entities.frequency = 'weekly';
        entities.day_of_week = dows[dowMatch[1].toLowerCase()];
    }

    const domMatch = /(?:\bon the\b|\bevery\b)\s+(\d+)(?:st|nd|rd|th)?(?:\s+of\b|\s+day\b)?/i.exec(message);
    if (domMatch) {
        const dom = parseInt(domMatch[1]);
        if (dom >= 1 && dom <= 31) {
            entities.day_of_month = dom;
            if (!entities.frequency) entities.frequency = 'monthly';
        }
    }

    // 2. Date extraction (Identify and store for masking)
    const monthsRegex = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
    const datePatterns: [RegExp, (m: RegExpMatchArray) => string][] = [
        [/\btoday\b/i, () => toLocalDateString(now)],
        [/\byesterday\b/i, () => {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            return toLocalDateString(d);
        }],
        [/\b(\d+)\s*days?\s*ago\b/i, (m) => {
            const d = new Date(now);
            d.setDate(d.getDate() - parseInt(m[1]));
            return toLocalDateString(d);
        }],
        [/\blast\s*week\b/i, () => {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            return toLocalDateString(d);
        }],
        [/\blast\s*month\b/i, () => {
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return toLocalDateString(d);
        }],
        [new RegExp(`\\b(${monthsRegex})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'), (m) => {
            const monthNames: Record<string, number> = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
            const month = monthNames[m[1].toLowerCase()];
            const day = parseInt(m[2]);
            return toLocalDateString(new Date(now.getFullYear(), month, day));
        }],
        [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthsRegex})\\b`, 'i'), (m) => {
            const monthNames: Record<string, number> = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
            const day = parseInt(m[1]);
            const month = monthNames[m[2].toLowerCase()];
            return toLocalDateString(new Date(now.getFullYear(), month, day));
        }],
        [/\bon\s*the\s*(\d{1,2})(?:st|nd|rd|th)?\b/i, (m) => {
            const d = new Date(now.getFullYear(), now.getMonth(), parseInt(m[1]));
            return toLocalDateString(d);
        }],
    ];

    let foundDateText = '';
    for (const [pattern, dateGen] of datePatterns) {
        const m = pattern.exec(message);
        if (m) {
            entities.date = dateGen(m);
            foundDateText = m[0];
            break;
        }
    }
    if (!entities.date) entities.date = toLocalDateString(now);

    // 3. Prepare masked text for Amount extraction
    let amountSearchText = message;
    if (foundDateText) {
        amountSearchText = amountSearchText.replace(new RegExp(foundDateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[DATE]');
    }
    if (intervalMatch) amountSearchText = amountSearchText.replace(new RegExp(intervalMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[INTERVAL]');
    if (domMatch) amountSearchText = amountSearchText.replace(new RegExp(domMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[DOM]');
    if (dowMatch) amountSearchText = amountSearchText.replace(new RegExp(dowMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[DOW]');

    // 4. Amount and Currency extraction
    const amountPattern = /(?:(USD|LKR|EUR|GBP|JPY|CAD|AUD|INR|SGD|AED|SAR|QAR|rs\.?|₨|\$|€|£|¥)\s*)?(\d[\d,]*(?:\.\d{1,2})?)(?!\d)(?:\s*(k|USD|LKR|EUR|GBP|JPY|CAD|AUD|INR|SGD|AED|SAR|QAR|rupees?|rs|bucks?))?/gi;
    
    let bestMatch: { amount: number, currency?: string, index: number, length: number } | null = null;
    let currentMatch;
    
    while ((currentMatch = amountPattern.exec(amountSearchText)) !== null) {
        let amount = parseFloat(currentMatch[2].replace(/,/g, ''));
        const prefix = (currentMatch[1] || '').trim();
        const suffix = (currentMatch[3] || '').trim();
        if (suffix.toLowerCase() === 'k') amount *= 1000;
        const currency = mapToCurrencyCode(prefix) || mapToCurrencyCode(suffix) || undefined;
        
        if (!bestMatch || currency || (amount > bestMatch.amount && !bestMatch.currency) || currentMatch.index > bestMatch.index + 10) {
            if (!bestMatch || currency || !bestMatch.currency) {
                bestMatch = { amount, currency, index: currentMatch.index, length: currentMatch[0].length };
            }
        }
    }

    if (bestMatch) {
        entities.amount = bestMatch.amount;
        if (bestMatch.currency) entities.currency = bestMatch.currency;
    }

    // 5. Category extraction
    const searchCategories = expenseCategories.length > 0 
        ? [...expenseCategories, ...incomeCategories].map(c => c.name) 
        : ['Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Shopping', 'Groceries', 'Salary', 'Investment', 'Gift', 'Other'];

    for (const cat of searchCategories) {
        if (messageLower.includes(cat.toLowerCase())) {
            entities.category = cat;
            break;
        }
    }

    // 6. Note extraction
    let noteText = amountSearchText;
    if (bestMatch) {
        const before = noteText.slice(0, bestMatch.index);
        const after = noteText.slice(bestMatch.index + bestMatch.length);
        noteText = before + after;
    }
    
    noteText = noteText
        .replace(/\[DATE\]|\[INTERVAL\]|\[DOM\]|\[DOW\]/gi, '')
        .replace(/\b(?:every|daily|weekly|monthly|yearly|recurring|repeats?|on|the|day|week|month|year|days|weeks|months|years|each|per)\b/gi, '')
        .replace(/\b(?:add|new|record|at|for|of|total|spent|bought|had|cost|was|i|just|about|dropped|blew|charged|used|got|received|earned|my|paid|income|salary|wage|stipend|bonus)\b/gi, '')
        .replace(/\b(?:usd|lkr|eur|gbp|jpy|rs\.?|₨|\$|€|£|¥|rupees?|bucks?)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (noteText.length > 1) {
        entities.note = noteText.charAt(0).toUpperCase() + noteText.slice(1);
    } else if (entities.category) {
        entities.note = entities.category;
    }

    return entities;
}

// ---------------------------------------------------------------------------
// Category Classification (Dynamic Hint Matching)
// ---------------------------------------------------------------------------

export function classifyCategory(
    text: string, 
    userCategories: AICategory[] = [], 
    pastTransactions: { note?: string, category: string, date: string }[] = []
): string {
    const textLower = text.toLowerCase();

    // 1. First check past transactions for a matching note
    if (pastTransactions.length > 0) {
        // Sort by date descending to get the most recent categorization
        const sortedTx = [...pastTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        for (const tx of sortedTx) {
            if (tx.note && tx.note.trim() !== '') {
                const noteLower = tx.note.toLowerCase().trim();
                // If the past note is long enough and found in our new message, reuse its category
                if (noteLower.length >= 3 && textLower.includes(noteLower)) {
                    // Ensure the category still exists in user's current categories
                    const exists = userCategories.length === 0 || userCategories.some(c => c.name.toLowerCase() === tx.category.toLowerCase());
                    if (exists) {
                        return tx.category;
                    }
                }
            }
        }
    }

    // 2. Dynamically build keywords from user's custom hints
    const categoryKeywords: Record<string, string[]> = {};
    
    // Fallback backward compatibility map (Always load, then let user categories override)
    categoryKeywords['Food'] = ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'takeaway', 'delivery', 'pizza', 'burger', 'rice', 'kottu', 'string hoppers', 'snacks', 'coffee', 'cafe', 'meal', 'eat'];
    categoryKeywords['Transport'] = ['uber', 'grab', 'taxi', 'bus', 'train', 'fuel', 'petrol', 'gas', 'parking', 'toll', 'transport', 'ride', 'commute', 'drive'];
    categoryKeywords['Bills'] = ['bill', 'electricity', 'water', 'internet', 'phone', 'rent', 'insurance', 'subscription', 'netflix', 'spotify'];
    categoryKeywords['Entertainment'] = ['movie', 'cinema', 'game', 'gaming', 'concert', 'party', 'outing', 'entertainment', 'fun'];
    categoryKeywords['Health'] = ['doctor', 'dentist', 'pharmacy', 'medicine', 'hospital', 'clinic', 'gym', 'health', 'medical'];
    categoryKeywords['Shopping'] = ['clothes', 'shoes', 'clothing', 'shop', 'mall', 'amazon', 'online', 'purchase', 'buy', 'bought', 'dress', 'fashion', 'outfit'];
    categoryKeywords['Groceries'] = ['grocery', 'groceries', 'supermarket', 'vegetables', 'fruits', 'market'];
    categoryKeywords['Salary'] = ['salary', 'payday', 'paycheck', 'paid', 'wage', 'stipend', 'income', 'bonus'];
    categoryKeywords['Investment'] = ['dividends', 'interest', 'investment', 'capital gain', 'crypto', 'stocks', 'equity'];
    categoryKeywords['Gift'] = ['gift', 'present', 'birthday', 'donation', 'grant'];

    // Override/Merge with actual categories from the database if provided
    if (userCategories.length > 0) {
        userCategories.forEach(c => {
            const hints = c.hints ? c.hints.toLowerCase().split(',').map(s => s.trim()) : [];
            // Merge hints with existing ones if category name already exists, otherwise create new
            if (categoryKeywords[c.name]) {
                const combined = [...categoryKeywords[c.name], ...hints, c.name.toLowerCase()];
                // Use a simple filter to unique to avoid ES2015+ Set iteration issues if any
                categoryKeywords[c.name] = combined.filter((val, idx, self) => self.indexOf(val) === idx);
            } else {
                categoryKeywords[c.name] = [...hints, c.name.toLowerCase()];
            }
        });
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

function formatCurrency(amount: number, locale: string = 'en-LK', currency: string = 'LKR'): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
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
    originalQuery: string,
    extracted: ExtractedEntities | null,
    matchedIds: string[] | null,
    expenses: Expense[],
    incomes: Income[],
    expenseCategories: AICategory[] = [],
    incomeCategories: AICategory[] = [],
    locale: string = 'en-LK',
    baseCurrency: string = 'LKR'
): ChatResponse {
    const actions: ChatAction[] = [];
    let answer = '';

    switch (intent) {
        case 'add_expense': {
            const amount = extracted?.amount || 0;
            const currency = extracted?.currency || baseCurrency;
            const category = extracted?.category || classifyCategory(originalQuery, expenseCategories, expenses);
            const note = extracted?.note || category;
            const date = extracted?.date || toLocalDateString(new Date());

            const isDefaultCategory = category === 'Other';
            if (isDefaultCategory) {
              const suggestions = expenseCategories.map((c: AICategory) => c.name).filter((n: string) => n !== 'Other').slice(0, 3).join(', ') || 'Food, Transport';
              answer = `I've prepared an expense for ${formatCurrency(amount, locale, currency)}. What category does it belong to? (e.g., ${suggestions})`;
              return {
                answer,
                actions: [],
                pendingAction: {
                  type: 'add_expense',
                  data: {
                    newExpense: { amount, currency, category, note, date },
                  },
                  confirmationText: `Add ${formatCurrency(amount, locale, currency)} expense for "${note}" (${category}) on ${formatDate(date)}?`,
                }
              } as ChatResponse;
            }

            answer = `I've prepared an expense for ${formatCurrency(amount, locale, currency)}. Confirm the details below.`;
            actions.push({
                type: 'add_expense',
                data: {
                    newExpense: { amount, currency, category, note, date },
                },
                confirmationText: `Add ${formatCurrency(amount, locale, currency)} expense for "${note}" (${category}) on ${formatDate(date)}?`,
            });
            break;
        }

        case 'add_income': {
            const amount = extracted?.amount || 0;
            const currency = extracted?.currency || baseCurrency;
            const category = extracted?.category || classifyCategory(originalQuery, incomeCategories, incomes);
            const note = extracted?.note || category;
            const date = extracted?.date || toLocalDateString(new Date());

            const isDefaultCategory = category === 'Other';
            if (isDefaultCategory) {
              const suggestions = incomeCategories.map((c: AICategory) => c.name).filter((n: string) => n !== 'Other').slice(0, 3).join(', ') || 'Salary, Gift';
              answer = `I've prepared a new income for ${formatCurrency(amount, locale, currency)}. What category does it belong to? (e.g., ${suggestions})`;
              return {
                answer,
                actions: [],
                pendingAction: {
                  type: 'add_income',
                  data: {
                    newIncome: { amount, currency, category, note, date },
                  },
                  confirmationText: `Add ${formatCurrency(amount, locale, currency)} income "${note}" on ${formatDate(date)}?`,
                }
              } as ChatResponse;
            }

            const isRedundantNote = !extracted?.note || 
                                   extracted.note.toLowerCase() === category.toLowerCase() || 
                                   ['paid', 'income', 'received', 'salary'].includes(extracted.note.toLowerCase());

            if (isRedundantNote) {
              answer = `I've prepared your ${formatCurrency(amount, locale, currency)} ${category.toLowerCase()} income record.`;
            } else {
              answer = `I've prepared your ${formatCurrency(amount, locale, currency)} ${category.toLowerCase()} income record from ${extracted?.note}.`;
            }
            actions.push({
                type: 'add_income',
                data: {
                    newIncome: { amount, currency, category, note, date },
                },
                confirmationText: isRedundantNote 
                    ? `Add ${formatCurrency(amount, locale, currency)} ${category.toLowerCase()} income on ${formatDate(date)}?`
                    : `Add ${formatCurrency(amount, locale, currency)} income "${note}" (${category}) on ${formatDate(date)}?`,
            });
            break;
        }

        case 'add_recurring': {
            const isIncome = /\b(?:income|salary|paycheck|earned|received|deposited|made|salary|bonus|freelance)\b/i.test(originalQuery);
            const type = isIncome ? 'income' : 'expense';

            const amount = extracted?.amount || 0;
            const currency = extracted?.currency || baseCurrency;
            const category = extracted?.category || classifyCategory(
                extracted?.note || '', 
                isIncome ? incomeCategories : expenseCategories,
                isIncome ? incomes : expenses
            );
            const note = extracted?.note || category;
            const frequency = extracted?.frequency || 'monthly';
            const interval = extracted?.interval || 1;
            const date = extracted?.date || toLocalDateString(new Date());
            
            // Scheduling fields
            const schedule = getRecurringSchedule(date, frequency);
            const day_of_week = extracted?.day_of_week ?? schedule.day_of_week;
            const day_of_month = extracted?.day_of_month ?? schedule.day_of_month;
            const month_of_year = extracted?.month_of_year ?? schedule.month_of_year;

            const freqStr = interval > 1 ? `every ${interval} ${frequency.replace('ly', 's')}` : frequency;
            answer = `I've set up a ${freqStr} ${type} for ${formatCurrency(amount, locale, currency)} (${note}).`;
            
            actions.push({
                type: 'add_recurring',
                data: {
                    newRecurring: { 
                        type, amount, currency, category, note, frequency, interval, 
                        start_date: date, day_of_week, day_of_month, month_of_year 
                    },
                },
                confirmationText: `Add ${freqStr} ${type} of ${formatCurrency(amount, locale, currency)} for "${note}" starting ${formatDate(date)}?`,
            });
            break;
        }

        case 'edit_expense': {
            if (matchedIds && matchedIds.length > 0) {
                const matched = expenses.find(e => e.id === matchedIds[0]);
                if (matched) {
                    const changes: Partial<Expense> = {};
                    if (extracted?.amount && extracted.amount !== Number(matched.amount)) changes.amount = extracted.amount;
                    if (extracted?.category && extracted.category.toLowerCase() !== matched.category.toLowerCase()) changes.category = extracted.category;
                    if (extracted?.date && extracted.date !== matched.date) changes.date = extracted.date;
                    if (extracted?.note && extracted.note.length > 2 && extracted.note !== matched.note && extracted.note !== matched.category) changes.note = extracted.note;

                    const changeDesc = Object.entries(changes).map(([k, v]) =>
                        k === 'amount' ? `amount to ${formatCurrency(v as number, locale, baseCurrency)}` : `${k} to "${v}"`
                    ).join(', ');

                    answer = `I found a matching transaction: ${formatCurrency(Number(matched.amount), locale, baseCurrency)} for ${matched.note || matched.category}. Which detail do you want to change?`;
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
            if (matchedIds && matchedIds.length > 0) {
                const matched = incomes.find(i => i.id === matchedIds[0]);
                if (matched) {
                    const changes: Partial<Income> = {};
                    if (extracted?.amount && extracted.amount !== Number(matched.amount)) changes.amount = extracted.amount;
                    if (extracted?.category && extracted.category.toLowerCase() !== matched.category.toLowerCase()) changes.category = extracted.category;
                    if (extracted?.date && extracted.date !== matched.date) changes.date = extracted.date;

                    const changeDesc = Object.entries(changes).map(([k, v]) =>
                        k === 'amount' ? `amount to ${formatCurrency(v as number, locale, baseCurrency)}` : `${k} to "${v}"`
                    ).join(', ');

                    answer = `I categorized that as ${extracted?.category}. You spent ${formatCurrency(extracted?.amount || 0, locale, baseCurrency)} on ${extracted?.note}.`;
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
            const queryAnswer = buildQueryAnswer(originalQuery, extracted!, expenses, incomes, locale, baseCurrency);
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
    originalQuery: string,
    entities: ExtractedEntities,
    expenses: Expense[],
    incomes: Income[],
    locale: string = 'en-LK',
    baseCurrency: string = 'LKR'
): { text: string; matchedIds: string[] } {
    const now = new Date();
    const queryForTime = originalQuery.toLowerCase();
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
    const isShowQuery = queryForTime.includes('show') || queryForTime.includes('list') || queryForTime.includes('all') || queryForTime.includes('everything') || queryForTime.includes('recent');
    
    let startDate: string | null = thisMonthStart;
    let endDate: string | null = null;
    if (queryForTime.includes('today')) {
        startDate = todayStr;
        timeLabel += (timeLabel ? '' : ' ') + 'today';
    } else if (queryForTime.includes('last month') || queryForTime.includes('previous month') || queryForTime.includes('past month')) {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`;
        timeLabel += (timeLabel ? '' : ' ') + 'last month';
    } else if (queryForTime.includes('last year') || queryForTime.includes('previous year')) {
        startDate = `${now.getFullYear() - 1}-01-01`;
        endDate = `${now.getFullYear() - 1}-12-31`;
        timeLabel += (timeLabel ? '' : ' ') + 'last year';
    } else if (queryForTime.includes('this year')) {
        startDate = `${now.getFullYear()}-01-01`;
        timeLabel += (timeLabel ? '' : ' ') + 'this year';
    } else if (queryForTime.includes('week')) {
        startDate = thisWeekStartStr;
        timeLabel += (timeLabel ? '' : ' ') + 'this week';
    } else if (queryForTime.includes('month')) {
        startDate = thisMonthStart;
        timeLabel += (timeLabel ? '' : ' ') + 'this month';
    } else if (entities.category && isShowQuery) {
        // Broad search for category
        startDate = null;
        timeLabel += (timeLabel ? '' : ' ') + 'all time';
    } else {
        // Default to this month
        startDate = thisMonthStart;
        timeLabel += (timeLabel ? '' : ' ') + 'this month';
    }

    if (startDate) filtered = filtered.filter(e => e.date && e.date >= startDate!);
    if (endDate) filtered = filtered.filter(e => e.date && e.date <= endDate!);

    const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const count = filtered.length;
    const matchedIds = filtered.slice(0, 10).map(e => e.id);

    // Category breakdown
    const breakdown: Record<string, number> = {};
    filtered.forEach(e => {
        const cat = e.category || 'Other';
        breakdown[cat] = (breakdown[cat] || 0) + Number(e.amount || 0);
    });

    // Income totals (respect the same timeframe)
    let filteredIncomes = incomes;
    if (startDate) filteredIncomes = filteredIncomes.filter(i => i.date && i.date >= startDate!);
    if (endDate) filteredIncomes = filteredIncomes.filter(i => i.date && i.date <= endDate!);
    const totalIncome = filteredIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);

    let text = '';

    if (queryForTime.includes('balance') || queryForTime.includes('net') || queryForTime.includes('left') || queryForTime.includes('saving')) {
        const net = totalIncome - total;
        text = `For ${timeLabel.trim()}: Income ${formatCurrency(totalIncome, locale, baseCurrency)} - Expenses ${formatCurrency(total, locale, baseCurrency)} = ${net >= 0 ? 'Surplus' : 'Deficit'} of ${formatCurrency(Math.abs(net), locale, baseCurrency)}.`;
    } else if (queryForTime.includes('income') || queryForTime.includes('earn')) {
        text = `Total income ${timeLabel.trim()}: ${formatCurrency(totalIncome, locale, baseCurrency)} from ${filteredIncomes.length} entries.`;
    } else if (queryForTime.includes('biggest') || queryForTime.includes('top') || queryForTime.includes('most')) {
        const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            text = `Your biggest category ${timeLabel}: ${sorted[0][0]} at ${formatCurrency(sorted[0][1], locale, baseCurrency)}`;
            if (sorted.length > 1) {
                text += `, followed by ${sorted[1][0]} (${formatCurrency(sorted[1][1], locale, baseCurrency)})`;
            }
            text += '.';
        } else {
            text = `No expenses found ${timeLabel}.`;
        }
    } else if (queryForTime.includes('breakdown') || queryForTime.includes('summary') || queryForTime.includes('trend')) {
        const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
        text = `Spending breakdown ${timeLabel} (${formatCurrency(total, locale, baseCurrency)} total):\n` +
            sorted.map(([cat, amt]) => `• ${cat}: ${formatCurrency(amt, locale, baseCurrency)}`).join('\n');
    } else if (queryForTime.includes('average') || queryForTime.includes('daily')) {
        const effectiveStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const days = Math.max(1, Math.ceil((now.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)));
        const avg = total / days;
        text = `Your daily average spending ${timeLabel}: ${formatCurrency(Math.round(avg), locale, baseCurrency)} (${formatCurrency(total, locale, baseCurrency)} over ${days} days).`;
    } else if (queryForTime.includes('recent') || queryForTime.includes('last') || queryForTime.includes('list') || queryForTime.includes('show') || queryForTime.includes('all') || queryForTime.includes('everything')) {
        text = `Here are your ${count > 10 ? 'most recent 10 of ' + count : count} expenses ${timeLabel} (${formatCurrency(total, locale, baseCurrency)} total):`;
    } else {
        // Default: total spending
        text = `You've spent ${formatCurrency(total, locale, baseCurrency)} ${timeLabel} across ${count} expense${count !== 1 ? 's' : ''}.`;
        if (Object.keys(breakdown).length > 0) {
            const top = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0];
            text += ` Top category: ${top[0]} (${formatCurrency(top[1], locale, baseCurrency)}).`;
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
        /^how much/i, /^what('s| is|'s|s)? my/i, /^whats?/i, /^show/i, /^list/i, /^breakdown/i,
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

    // Recurring patterns (check before simple expense/income since they are more specific)
    if (/\b(?:every|recurring|repeats?|monthly|weekly|daily|yearly|subscription|rent|bill|utility|insurance|membership|gym|netflix|spotify|icloud)\b/i.test(lower) && /\d/.test(lower)) {
        return 'add_recurring';
    }

    // Income patterns (if it has an amount and an income keyword)
    if (/\b(?:got paid|received|earned|salary|paycheck|income|deposited|made|freelance|sold)\b/i.test(lower) && /\d/.test(lower)) {
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
    incomes: Income[] = [],
    locale: string = 'en-LK',
    baseCurrency: string = 'LKR',
    history: ChatMessage[] = [],
    pendingAction?: ChatAction
): Promise<ChatResponse> {
    console.log(`[LocalAI] Processing query length: ${message.length} (History: ${history.length} msgs)`);

    // Context handling: Check if this is a reply to a pending action
    if (pendingAction && (pendingAction.type === 'add_expense' || pendingAction.type === 'add_income' || pendingAction.type === 'add_recurring')) {
        // Try to see if message is a category
        const cats = pendingAction.type === 'add_income' ? incomeCategories : expenseCategories;
        const pastTx = pendingAction.type === 'add_income' ? incomes : expenses;
        const cat = classifyCategory(message, cats, pastTx);
        
        // If the user replied with something that matched a category, or just a single word
        // we'll assume they're confirming the category.
        const isSingleWord = message.trim().split(/\s+/).length <= 2;
        
        if (cat !== 'Other' || isSingleWord) {
            console.log(`[LocalAI] Resolving pending action with category: ${cat}`);
            const updatedAction = { ...pendingAction };
            if (updatedAction.data?.newExpense) {
                updatedAction.data.newExpense.category = cat;
                if (updatedAction.data.newExpense.note === 'Other') updatedAction.data.newExpense.note = cat;
                updatedAction.confirmationText = `Add ${formatCurrency(updatedAction.data.newExpense.amount!, locale, updatedAction.data.newExpense.currency || baseCurrency)} expense for "${updatedAction.data.newExpense.note}" (${cat})?`;
            } else if (updatedAction.data?.newIncome) {
                updatedAction.data.newIncome.category = cat;
                if (updatedAction.data.newIncome.note === 'Other') updatedAction.data.newIncome.note = cat;
                updatedAction.confirmationText = `Add ${formatCurrency(updatedAction.data.newIncome.amount!, locale, updatedAction.data.newIncome.currency || baseCurrency)} income "${updatedAction.data.newIncome.note}" (${cat})?`;
            } else if (updatedAction.data?.newRecurring) {
                updatedAction.data.newRecurring.category = cat;
                if (updatedAction.data.newRecurring.note === 'Other' || !updatedAction.data.newRecurring.note) updatedAction.data.newRecurring.note = cat;
                const freq = updatedAction.data.newRecurring.frequency || 'monthly';
                updatedAction.confirmationText = `Add ${freq} transaction for ${formatCurrency(updatedAction.data.newRecurring.amount!, locale, updatedAction.data.newRecurring.currency || baseCurrency)} (${cat})?`;
            }
            
            return {
                answer: `Got it, I've set the category to ${cat}. Should I save this?`,
                actions: [updatedAction],
                confidence: 1.0
            };
        }
    }
    
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
    const response = buildResponse(intent, processedMessage, entities, matchedIds, expenses, incomes, expenseCategories, incomeCategories, locale, baseCurrency);

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
    expenses: Expense[],
    locale: string = 'en-LK',
    baseCurrency: string = 'LKR'
): Promise<{ answer: string; matchedIds: string[] }> {
    const entities = extractEntities(query);
    const result = buildQueryAnswer(query, entities, expenses, [], locale, baseCurrency);
    return { answer: result.text, matchedIds: result.matchedIds };
}
