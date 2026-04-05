
import { extractEntities } from './local-ai';

function test(message: string) {
    console.log(`\nTesting: "${message}"`);
    const entities = extractEntities(message);
    console.log(`  Date: ${entities.date}`);
    console.log(`  Amount: ${entities.amount}`);
    console.log(`  Note: ${entities.note}`);
    console.log(`  Category: ${entities.category}`);
}

console.log("--- Testing Income Category Identification ---");
test("got paid 5.5k on 23 march");
test("received a gift of 100");
test("Gift");
test("salary of 50000");
test("bonus payment 200");
test("dividends from stocks 50");
