import { GoogleGenAI } from "@google/genai";
import { Room, UserProfile } from "../types";


export async function translateMessage(text: string, targetLang: string): Promise<string> {
  if (!text) return "";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text to the language with code "${targetLang}". Only return the translated text, nothing else.\n\nText: ${text}`,
    });
    const response = await model;
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

export async function getRoomSuggestions(user: UserProfile, rooms: Room[]): Promise<string[]> {
  if (rooms.length === 0) return [];
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const roomsData = rooms.map(r => ({ id: r.id, name: r.name, theme: r.theme, languages: r.languages }));
    const prompt = `Given a user with language "${user.language}" and interests: ${user.interests.join(", ") || "none"}.
    And a list of chat rooms: ${JSON.stringify(roomsData)}.
    Suggest the top 3 most relevant room IDs for this user. Return only a JSON array of strings (the IDs).`;

    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const response = await model;
    const ids = JSON.parse(response.text || "[]");
    return ids;
  } catch (error) {
    console.error("Suggestion error:", error);
    return [];
  }
}

export async function detectLanguage(text: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Detect the language of the following text and return only the ISO 639-1 language code (e.g., "en", "es").\n\nText: ${text}`,
    });
    const response = await model;
    return response.text?.trim().toLowerCase() || "en";
  } catch (error) {
    return "en";
  }
}
