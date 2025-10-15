import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentParameters, Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    try {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    } catch (error) {
        console.error("Failed to initialize GoogleGenAI:", error);
        ai = null;
    }
}

export const isApiConfigured = !!ai;

const getMimeType = (dataUrl: string): string => {
  return dataUrl.split(',')[0].split(':')[1].split(';')[0];
};

export const generateAsset = async (prompt: string): Promise<string | null> => {
  if (!isApiConfigured) {
    alert('Khóa API Gemini chưa được định cấu hình. Vui lòng thiết lập biến môi trường API_KEY.');
    console.error("Gemini AI client not initialized. API_KEY is missing or invalid.");
    return null;
  }
  try {
    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const firstCandidate = response.candidates?.[0];
    if (firstCandidate?.content?.parts) {
      for (const part of firstCandidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating asset:", error);
    if (error instanceof Error) {
        alert(`Đã xảy ra lỗi khi tạo tài sản: ${error.message}`);
    } else {
        alert(`Đã xảy ra lỗi không xác định khi tạo tài sản.`);
    }
    return null;
  }
};

export const composeOrEditScene = async (parts: (string | Part)[]): Promise<string | null> => {
  if (!isApiConfigured) {
    alert('Khóa API Gemini chưa được định cấu hình. Vui lòng thiết lập biến môi trường API_KEY.');
    console.error("Gemini AI client not initialized. API_KEY is missing or invalid.");
    return null;
  }
  try {
    const processedParts: Part[] = parts.map(part => {
        if (typeof part === 'string') {
            return { text: part };
        }
        return part;
    });

    const request: GenerateContentParameters = {
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: processedParts,
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    };

    const response = await ai!.models.generateContent(request);
    
    const firstCandidate = response.candidates?.[0];
    if (firstCandidate?.content?.parts) {
      for (const part of firstCandidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error composing scene:", error);
    if (error instanceof Error) {
        alert(`Đã xảy ra lỗi khi dựng cảnh: ${error.message}`);
    } else {
        alert(`Đã xảy ra lỗi không xác định khi dựng cảnh.`);
    }
    return null;
  }
};


export const imageToPart = async (src: string): Promise<Part> => {
    return {
        inlineData: {
            data: src.split(',')[1],
            mimeType: getMimeType(src)
        }
    };
};
