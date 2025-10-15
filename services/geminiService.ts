import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentParameters, Part } from "@google/genai";

let ai: GoogleGenAI | null = null;

export const initializeGemini = (apiKey: string): boolean => {
    if (!apiKey) {
        ai = null;
        return false;
    }
    try {
        ai = new GoogleGenAI({ apiKey });
        return true;
    } catch (error) {
        console.error("Failed to initialize GoogleGenAI:", error);
        ai = null;
        return false;
    }
};

export const isApiConfigured = (): boolean => !!ai;

const getMimeType = (dataUrl: string): string => {
  return dataUrl.split(',')[0].split(':')[1].split(';')[0];
};

export const generateAsset = async (prompt: string): Promise<string | null> => {
  if (!isApiConfigured()) {
    alert('Vui lòng thiết lập khóa API Gemini của bạn trong phần cài đặt.');
    console.error("Gemini AI client not initialized.");
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
  } catch (error)
{
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
  if (!isApiConfigured()) {
    alert('Vui lòng thiết lập khóa API Gemini của bạn trong phần cài đặt.');
    console.error("Gemini AI client not initialized.");
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