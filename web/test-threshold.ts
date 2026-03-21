import { processChat } from './src/shared/local-ai';
import { Expense, Income } from './src/shared/models';

async function testThreshold() {
    const expenses: Expense[] = [];
    const incomes: Income[] = [];

    const testCases = [
        "add 500 for uber",           // Should pass (high confidence / regex)
        "made 5k on crypto",          // Should pass (regex)
        "Show food expenses",          // Should pass (regex)
        "write an essay on my life",   // Should fail (<45% confidence)
        "are u stupid",               // Should fail (<45% confidence)
        "tell me a joke",             // Should fail (<45% confidence)
    ];

    console.log("--- Testing Confidence Thresholds ---");

    for (const text of testCases) {
        console.log(`\nInput: "${text}"`);
        const response = await processChat(text, expenses, [], [], incomes);
        console.log(`Response: "${response.answer}"`);
        console.log(`Actions: ${response.actions.length}`);
    }
}

testThreshold().catch(console.error);
