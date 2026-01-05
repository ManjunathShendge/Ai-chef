
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Standardizing common encoding/decoding helper functions
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export const analyzeImage = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: "Analyze this food image. Identify the dish, list possible ingredients, estimate calories, and suggest a simple cooking tip. Format your response clearly." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dishName: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          calories: { type: Type.STRING },
          suggestedAction: { type: Type.STRING }
        },
        required: ["dishName", "ingredients", "calories", "suggestedAction"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const editFoodImage = async (base64Image: string, prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    }
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const searchRecipes = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find high quality, diverse global recipes for: ${query}. Look for authentic versions from their country of origin. Provide a structured list.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const urls = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Recipe Source',
    url: chunk.web?.uri
  })).filter((c: any) => c.url) || [];

  return { text: response.text, sources: urls };
};

export const createLiveCookingSession = async (callbacks: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      },
      systemInstruction: `You are ChefGemini, a world-class culinary AI assistant with VISION capabilities. You speak English, Hindi, and Tamil.

VISION ASSISTANCE:
- You will receive a stream of image frames from the user's camera.
- OBSERVE their kitchen environment, ingredients, and cooking progress.
- EXPLAIN what you see: "I see you have some fresh basil there," or "Your pan looks a bit too hot, those onions might burn."
- Answer visual questions: "Does this look cooked enough?" or "Which of these vegetables should I chop first?"

LANGUAGE GUIDELINES:
- Respond in the language the user speaks (English, Hindi, or Tamil).
- Tamil example: "வணக்கம், உங்கள் சமையலறை நன்றாக இருக்கிறது!" (Hello, your kitchen looks great!)
- Hindi example: "नमस्ते, आपके पास बहुत अच्छे मसाले हैं।" (Hello, you have very nice spices.)

CORE BEHAVIORS:
1. STEP-BY-STEP: Only provide ONE instruction at a time.
2. CONFIRMATION: Always ask if they are ready before the next step.
3. CONTEXT AWARE: Use the video feed to make your advice more relevant.
4. TONE: Professional, encouraging, and visually observant.

Provide practical, concise spoken responses for a busy kitchen environment.`
    }
  });
};
