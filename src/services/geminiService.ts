import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// Note: In this environment, GEMINI_API_KEY is automatically provided in process.env
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export const gemini = {
  translate: async (text: string, targetLang: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${targetLang}. Only return the translation, nothing else. Text: "${text}"`,
      });
      
      return response.text?.trim() || text;
    } catch (error) {
      console.error("Gemini Translation Error:", error);
      throw error;
    }
  },

  transcribe: async (base64Audio: string, mimeType: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Audio
            }
          },
          {
            text: "Transcribe the audio exactly. If you detect the language, transcribe it in that language. Only return the transcription, nothing else."
          }
        ],
      });
      
      return response.text?.trim() || "No se pudo transcribir el audio.";
    } catch (error) {
      console.error("Gemini Transcription Error:", error);
      throw error;
    }
  },

  speak: async (text: string, voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Read this aloud clearly: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data received from Gemini TTS");
      
      // Gemini TTS returns raw PCM (Linear16, Mono, 24kHz).
      // Browsers requires a container (like WAV) to play audio via the Audio object.
      const rawData = atob(base64Audio);
      const buffer = new ArrayBuffer(44 + rawData.length);
      const view = new DataView(buffer);
      
      const writeString = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) {
          view.setUint8(offset + i, s.charCodeAt(i));
        }
      };
      
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      
      // RIFF header
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + rawData.length, true);
      writeString(8, 'WAVE');
      // fmt subchunk
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
      view.setUint16(32, numChannels * bitsPerSample / 8, true);
      view.setUint16(34, bitsPerSample, true);
      // data subchunk
      writeString(36, 'data');
      view.setUint32(40, rawData.length, true);
      
      // Write PCM data
      for (let i = 0; i < rawData.length; i++) {
        view.setUint8(44 + i, rawData.charCodeAt(i));
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      throw error;
    }
  }
};
