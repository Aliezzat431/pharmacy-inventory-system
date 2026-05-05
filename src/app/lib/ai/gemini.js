import { GoogleGenerativeAI } from '@google/generative-ai';

// تهيئة Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// اختيار الموديل المناسب
export const geminiModel = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite", // أو استخدم "gemini-1.5-pro" للمهام المعقدة
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 2048,
  }
});

// ✅ تحويل الأدوات (Tools) إلى صيغة Gemini الصحيحة
export function convertToolsToGemini(tools) {
  // Gemini Function Declaration format
  return {
    functionDeclarations: tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: {
        type: tool.function.parameters.type || "object",
        properties: tool.function.parameters.properties || {},
        required: tool.function.parameters.required || []
      }
    }))
  };
}

// ✅ دالة مساعدة لاستخراج function calls من رد Gemini
export function extractFunctionCalls(response) {
  try {
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) return [];
    
    const parts = candidates[0].content.parts;
    if (!parts) return [];
    
    const functionCalls = [];
    for (const part of parts) {
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args
        });
      }
    }
    
    return functionCalls;
  } catch (error) {
    console.error("Error extracting function calls:", error);
    return [];
  }
}