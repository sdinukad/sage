import { GoogleGenerativeAI } from "@google/generative-ai";
import { Category, Expense, ChatResponse, Income, ChatAction } from './models';

const MODELS = [
    'gemma-3-27b-it', // Primary (Instruction Tuned)
    'gemma-3-12b-it', 
    'gemma-3-4b-it',  
    'gemma-3-1b-it',
    'gemini-2.0-flash' // Safe ultimate fallback
];

// Initialize the SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GeminiResponse {
    answer?: string;
    actions?: ChatAction[];
}

async function callGemini(prompt: string): Promise<GeminiResponse> {
    let lastError: any;

    for (const modelName of MODELS) {
        try {
            console.log(`Calling Gemini SDK with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });
            
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            console.log(`Gemini raw text received from ${modelName} (first 100 chars):`, text.substring(0, 100));

            try {
                return JSON.parse(text) as GeminiResponse;
            } catch (e) {
                console.warn(`JSON.parse failed for ${modelName}, trying regex match`, e);
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        return JSON.parse(jsonMatch[0]) as GeminiResponse;
                    } catch (innerE) {
                        console.error(`Regex JSON match parse failed for ${modelName}`, innerE);
                    }
                }
                // If it's just text, treat it as the answer
                return { answer: text, actions: [] };
            }
        } catch (err: any) {
            console.error(`Error with model ${modelName}:`, err?.message || err);
            lastError = err;
            // Continue to next model in loop
            continue;
        }
    }

    // If we get here, all models failed
    console.error('All models failed in callGemini.');
    throw lastError || new Error('All models failed');
}

// categoriseExpense removed as it was hardcoded and is now superseded by dynamic categories.

export async function processSageChat(
    message: string,
    expenses: Expense[],
    expenseCategories: string[] = [],
    incomeCategories: string[] = [],
    incomes: Income[] = []
): Promise<ChatResponse> {
    const expCats = expenseCategories.length > 0 ? expenseCategories.join(', ') : 'Food, Transport, Bills, Entertainment, Health, Shopping, Other';
    const incCats = incomeCategories.length > 0 ? incomeCategories.join(', ') : 'Salary, Bonus, Investment, Gift, Other';

    const prompt = `You are Sage, a helpful personal accountant. 
    Analyze the user's message, current expenses, and current incomes. 
    You can now track both EXPENSES and INCOMES (e.g., salary, bonus).
    
    Expense Categories: ${expCats}
    Income Categories: ${incCats}
    
    For each request in the message, identify the intent:
    1. QUERY: Ask for information about spending or income.
    2. ADD_EXPENSE: Record a new expense.
    3. ADD_INCOME: Record a new income.
    4. EDIT_EXPENSE: Modify an existing expense.
    5. EDIT_INCOME: Modify an existing income.

    Return ONLY this JSON structure:
    {
        "answer": "A human-like greeting and summary",
        "actions": [
            {
                "type": "query" | "add_expense" | "add_income" | "edit_expense" | "edit_income" | "unknown",
                "data": {
                    "matchedIds": ["uuid", ...],
                    "newExpense": { "amount": number, "category": "...", "note": "...", "date": "ISO string" },
                    "newIncome": { "amount": number, "category": "Salary"|"Bonus"|"Investment"|"Gift"|"Other", "note": "...", "date": "ISO string" },
                    "editExpense": { "id": "uuid", "changes": { ... } },
                    "editIncome": { "id": "uuid", "changes": { ... } }
                },
                "confirmationText": "Clear confirmation question for this action"
            }
        ]
    }

    Current Date: ${new Date().toISOString()}
    Expenses: ${JSON.stringify(expenses)}
    Incomes: ${JSON.stringify(incomes)}
    User Message: ${message}`;

    try {
        const result = await callGemini(prompt);
        return {
            answer: result.answer || "Processed your request.",
            actions: result.actions || []
        };
    } catch (error) {
        console.error("Sage Chat Logic Error:", error);
        return {
            answer: "Sorry, I'm having trouble processing that right now.",
            actions: []
        };
    }
}

export async function processSageChatStream(
    message: string,
    expenses: Expense[],
    expenseCategories: string[] = [],
    incomeCategories: string[] = [],
    incomes: Income[] = []
): Promise<ReadableStream> {
    const expCats = expenseCategories.length > 0 ? expenseCategories.join(', ') : 'Food, Transport, Bills, Entertainment, Health, Shopping, Other';
    const incCats = incomeCategories.length > 0 ? incomeCategories.join(', ') : 'Salary, Bonus, Investment, Gift, Other';

    const prompt = `You are Sage, a helpful personal accountant. 
    Analyze the user's message, current expenses, and current incomes. 
    You can now track both EXPENSES and INCOMES (e.g., salary, bonus).
    
    Expense Categories: ${expCats}
    Income Categories: ${incCats}
    
    For each request in the message, identify the intent:
    1. QUERY: Ask for information about spending or income.
    2. ADD_EXPENSE: Record a new expense.
    3. ADD_INCOME: Record a new income.
    4. EDIT_EXPENSE: Modify an existing expense.
    5. EDIT_INCOME: Modify an existing income.

    Return ONLY this JSON structure:
    {
        "answer": "A human-like greeting and summary",
        "actions": [
            {
                "type": "query" | "add_expense" | "add_income" | "edit_expense" | "edit_income" | "unknown",
                "data": {
                    "matchedIds": ["uuid", ...],
                    "newExpense": { "amount": number, "category": "...", "note": "...", "date": "ISO string" },
                    "newIncome": { "amount": number, "category": "Salary"|"Bonus"|"Investment"|"Gift"|"Other", "note": "...", "date": "ISO string" },
                    "editExpense": { "id": "uuid", "changes": { ... } },
                    "editIncome": { "id": "uuid", "changes": { ... } }
                },
                "confirmationText": "Clear confirmation question for this action"
            }
        ]
    }

    Current Date: ${new Date().toISOString()}
    Expenses: ${JSON.stringify(expenses)}
    Incomes: ${JSON.stringify(incomes)}
    User Message: ${message}`;

    let lastError: any;

    for (const modelName of MODELS) {
        try {
            console.log(`Attempting streaming with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName
            });
            
            const result = await model.generateContentStream(prompt);
            
            // If we successfully get the result object, we can start the stream
            // Note: The actual streaming errors happen inside the for-await loop, 
            // but the initial connection/demand check happens here.
            
            const encoder = new TextEncoder();
            return new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of result.stream) {
                            controller.enqueue(encoder.encode(chunk.text()));
                        }
                        controller.close();
                    } catch (err) {
                        console.error(`Streaming error during iteration with ${modelName}:`, err);
                        // We can't easily fallback once the stream has started sending data to the client,
                        // but we can at least log it.
                        controller.error(err);
                    }
                }
            });
        } catch (err: any) {
            console.error(`Failed to start stream with model ${modelName}:`, err?.message || err);
            lastError = err;
            // Only fallback if it's a transient error or not found
            if (err?.status === 503 || err?.status === 429 || err?.status === 404) {
                continue;
            }
            throw err; // For other errors, fail fast
        }
    }

    throw lastError || new Error('All models failed to start streaming');
}
