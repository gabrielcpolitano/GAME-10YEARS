
import { GoogleGenAI, Type } from "@google/genai";
import { Milestone, UserContext } from "../types";

// Always use the process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRoadmap = async (context: UserContext): Promise<Milestone[]> => {
  const prompt = `
    Crie uma jornada de 10 anos para uma pessoa chamada ${context.name}, começando no final de 2026 e terminando no final de 2035.
    Status Atual: ${context.currentStatus}
    Objetivo em 10 anos: ${context.tenYearGoal}

    Gere exatamente 10 marcos (um para o final de cada ano: 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035).
    Para cada ano, descreva o que foi conquistado até o FINAL daquele ano, a evolução progressiva em direção ao objetivo, desafios realistas e conselhos inspiradores.
    Mantenha o tom motivacional, épico e criativo.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { 
              type: Type.INTEGER,
              description: "O ano específico do marco (ex: 2026)."
            },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            advice: { type: Type.STRING },
            challenge: { type: Type.STRING }
          },
          required: ["year", "title", "description", "advice", "challenge"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse roadmap:", error);
    return [];
  }
};
