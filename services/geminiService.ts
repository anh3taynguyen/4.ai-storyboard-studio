

import { GoogleGenAI, Modality } from "@google/genai";
// Fix: Use GenerateContentParameters instead of the deprecated GenerateContentRequest.
import type { GenerateContentParameters, Part } from "@google/genai";

let ai: GoogleGenAI | null = null;

export const initializeGemini = (apiKey: string) => {
    if (apiKey) {
        try {
            ai = new GoogleGenAI({ apiKey });
        } catch (error) {
            console.error("Failed to initialize GoogleGenAI:", error);
            ai = null;
            alert("Không thể khởi tạo Gemini AI. Vui lòng kiểm tra xem khóa API của bạn có hợp lệ không.");
        }
    } else {
        ai = null;
    }
};

const getMimeType = (dataUrl: string): string => {
  return dataUrl.split(',')[0].split(':')[1].split(';')[0];
};

// Fix: Removed apiKey parameter. The function now uses the globally configured 'ai' instance.
export const generateAsset = async (prompt: string): Promise<string | null> => {
  if (!ai) {
    alert('Chưa thiết lập Khóa API. Vui lòng thiết lập Khóa API của bạn bằng biểu tượng cài đặt.');
    console.error("Gemini AI client not initialized.");
    return null;
  }
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating asset:", error);
    alert(`Đã xảy ra lỗi khi tạo tài sản: ${error.message}`);
    return null;
  }
};

// Fix: Removed apiKey parameter. The function now uses the globally configured 'ai' instance.
export const composeOrEditScene = async (parts: (string | Part)[]): Promise<string | null> => {
  if (!ai) {
    alert('Chưa thiết lập Khóa API. Vui lòng thiết lập Khóa API của bạn bằng biểu tượng cài đặt.');
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

    // Fix: Use GenerateContentParameters instead of the deprecated GenerateContentRequest.
    const request: GenerateContentParameters = {
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: processedParts,
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    };

    const response = await ai.models.generateContent(request);

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error composing scene:", error);
    alert(`Đã xảy ra lỗi khi dựng cảnh: ${error.message}`);
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