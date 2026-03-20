import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadEnvConfig } from "@next/env";
loadEnvConfig('./');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function testModel(modelName: string) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        console.log(`${modelName}: SUCCESS`);
    } catch (e: any) {
        console.error(`${modelName}: FAILED - ${e.message.split('\\n')[0]}`);
    }
}

async function run() {
    await testModel('gemini-3-flash-preview');
    await testModel('gemini-flash-latest');
    await testModel('gemini-2.5-flash-lite');
    await testModel('gemini-3.1-flash-lite-preview');
}
run();
