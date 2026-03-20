import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadEnvConfig } from "@next/env";
loadEnvConfig('./');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        console.log("Available models:", data.models.map((m: any) => m.name).join(", "));
    } catch (e: any) {
        console.error(`FAILED - ${e.message}`);
    }
}
run();
