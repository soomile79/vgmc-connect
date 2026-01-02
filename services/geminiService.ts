import { GoogleGenAI } from "@google/genai";
import { Member } from "../types";

// Helper to sanitize data for AI context (remove sensitive fields if necessary, though this is a private internal app)
const prepareDataForContext = (members: Member[]) => {
  return members.map(m => ({
    name: `${m.koreanName} (${m.englishName})`,
    mokjang: m.mokjang,
    position: m.position,
    status: m.status,
    birthday: m.birthday,
    phone: m.phone,
    address: m.address,
    notes: m.memo,
    isBaptized: m.isBaptized
  }));
};

export const askGeminiAboutMembers = async (query: string, members: Member[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "Please configure your API Key to use the AI Assistant.";
    }

    const ai = new GoogleGenAI({ apiKey });
    const membersContext = JSON.stringify(prepareDataForContext(members));
    
    const prompt = `
      You are a helpful assistant for a church membership management application.
      Here is the current list of members in JSON format:
      ${membersContext}

      User Query: "${query}"

      Answer the user's question based strictly on the provided member data. 
      If the user asks for a list, provide a neat bulleted list.
      If the user asks for counts or stats, calculate them.
      If the user asks about a specific person, summarize their info.
      Keep the tone professional, warm, and helpful.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};
