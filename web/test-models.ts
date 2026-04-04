import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("No API key");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const modelsToTest = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];

async function testModels() {
  for (const modelName of modelsToTest) {
    try {
      console.log(`\nTesting ${modelName}...`);
      const start = Date.now();
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Parse this and return JSON: {'key':'hello'}. Use only JSON.");
      const text = result.response.text();
      const elapsed = Date.now() - start;
      console.log(`[SUCCESS] ${modelName} took ${elapsed}ms.\nResponse: ${text.substring(0, 50).replace(/\n/g, ' ')}`);
    } catch (e: any) {
      console.log(`[FAILED] ${modelName} - ${e.message}`);
    }
  }
}

testModels();
