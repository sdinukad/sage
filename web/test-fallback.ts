import { processChat } from './src/shared/local-ai';

async function main() {
    console.log("Testing 1: Multiple values with words.");
    const res1 = await processChat("went out with friends spent 5k on alcohol and spent 6500 on the restaraunt bill", [], [], [], []);
    console.log("Result 1:", JSON.stringify(res1, null, 2));

    console.log("\nTesting 2: Words to numbers.");
    const res2 = await processChat("Fifty thousand for rent", [], [], [], []);
    console.log("Result 2:", JSON.stringify(res2, null, 2));
}

main().catch(console.error);
