import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { AICategory } from './src/shared/models';
import fs from 'fs';

const defaultExpenseCats: AICategory[] = [
    { name: 'Food' },
    { name: 'Transport' },
    { name: 'Bills' },
    { name: 'Entertainment' },
    { name: 'Health' },
    { name: 'Shopping' },
    { name: 'Other' },
];

const defaultIncomeCats: AICategory[] = [
    { name: 'Salary' },
    { name: 'Bonus' },
    { name: 'Investment' },
    { name: 'Gift' },
    { name: 'Other' },
];

const prompts = [
    "Spent $5 on coffee.",
    "Paid 10 dollars for lunch.",
    "$50 for gas.",
    "Bought a sandwich for $7.50.",
    "$120 at the grocery store.",
    "Just spent $15 on a movie ticket.",
    "$3 for parking.",
    "Dinner was $45.",
    "$20 for a haircut.",
    "Bought a book for $18.",
    "Spent $60 on groceries at Whole Foods.",
    "$15 for Uber ride home, category: Transport.",
    "Paid $1200 for rent.",
    "$30 on pharmacy supplies.",
    "Spent $100 on new running shoes under Clothing.",
    "$5.50 for a latte at Starbucks - Drinks.",
    "Paid the electricity bill, $85.",
    "$40 for cat food.",
    "Spent $25 on office supplies at Staples.",
    "$200 on car insurance.",
    "Yesterday I spent $40 on a nice dinner.",
    "Log $20 for lunch last Friday.",
    "I bought a shirt for $30 two days ago.",
    "Spent $15 on snacks this morning.",
    "Last night we went to the bar and I spent $50.",
    "Put $10 in the parking meter an hour ago.",
    "I paid $250 for my flight back in January.",
    "$15 for breakfast earlier today.",
    "Last weekend I spent $200 at the spa.",
    "Log $10 for coffee every day this week.",
    "I spent $15 on lunch and $5 on a drink.",
    "Today's costs: $10 for coffee, $25 for gas, and $12 for a salad.",
    "Bought a laptop for $1200 and a mouse for $50.",
    "$30 for a gift and $5 for the wrapping paper.",
    "Log $15 for my meal and $3 for my friend's soda.",
    "Spent $100 total: $60 on food and $40 on drinks.",
    "Added $50 for gas and $10 for a car wash.",
    "$20 for movie tickets and $15 for popcorn.",
    "Grocery trip cost $85, plus $10 for the pharmacy next door.",
    "$45 for dinner, $10 tip.",
    "Received $3000 salary today.",
    "Got paid $150 for freelance work.",
    "Found $20 on the street!",
    "My tax refund of $500 arrived.",
    "Grandma sent $100 for my birthday.",
    "Sold my old bike for $120.",
    "Dividend payment of $15 received.",
    "Bonus check of $1000 came in.",
    "Refunded $50 from Amazon for a returned item.",
    "Monthly rental income of $800.",
    "How much did I spend today?",
    "What was my total spending last week?",
    "Show me my food expenses for this month.",
    "How much have I spent on gas this year?",
    "Did I spend more on coffee or lunch this month?",
    "What's my biggest expense this week?",
    "Show me a summary of my spending in March.",
    "How much money do I have left in budget?",
    "List all my transactions over $100.",
    "What's my average daily spending?",
    "Change that $5 coffee from earlier to $6.",
    "Delete my last expense.",
    "I made a mistake, the lunch was $15, not $50.",
    "Move my Uber ride from Food to Transport.",
    "Rename the category Fun to Entertainment.",
    "Delete all transactions from yesterday.",
    "Change the date of my $100 grocery bill to last Saturday.",
    "Clear my entire history for this month.",
    "Update my salary to $3200.",
    "Correct the $45 dinner to include a $5 tip.",
    "Spent 50 Euro on a train ticket.",
    "Paid 1000 Yen for ramen.",
    "$50 CAD for a souvenir.",
    "Log £20 for a pub lunch.",
    "Spent 500 Pesos on a taxi.",
    "Conversion: How much is 100 USD in EUR?",
    "I'm in London, log £5 for coffee.",
    "Spent 30 Swiss Francs on chocolate.",
    "$200 AUD for hotel stay.",
    "Paid 1500 Rupees for a shirt."
];

async function main() {
    const { processChat } = await import('./src/shared/local-ai');
    const { processSageChat } = await import('./src/shared/gemini');
    
    console.log(`Testing ${prompts.length} prompts...`);
    const results = [];
    
    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        try {
            let result = await processChat(prompt, [], defaultExpenseCats, defaultIncomeCats, [], 'en-US', 'USD', [], undefined);
            let usedGemini = false;
            
            if (result.confidence !== undefined && result.confidence < 0.65) {
                result = await processSageChat(prompt, [], defaultExpenseCats, defaultIncomeCats, [], 'en-US', 'USD', [], undefined);
                usedGemini = true;
            }
            
            results.push({ prompt, result, usedGemini });
            console.log(`[${i + 1}/${prompts.length}] Processed: ${prompt.substring(0, 30)}... (Gemini: ${usedGemini})`);
            
        } catch (error: any) {
            console.error(`[${i + 1}/${prompts.length}] Error on prompt: ${prompt}`, error.message);
            results.push({ prompt, error: error.message, result: null });
        }
    }
    
    fs.writeFileSync('test-100-results.json', JSON.stringify(results, null, 2));
    console.log('Results saved to test-100-results.json');
}

main().catch(console.error);
