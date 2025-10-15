
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

// Fix: Switched from `generateImages` with `imagen-4.0-generate-001` to `generateContent` with `gemini-2.5-flash-image`
// to support free-tier API keys and avoid the "billed users only" error.
export const generateAsset = async (prompt: string): Promise<string | null> => {
  if (!ai) {
    alert('Chưa thiết lập Khóa API. Vui lòng thiết lập Khóa API của bạn bằng biểu tượng cài đặt.');
    console.error("Gemini AI client not initialized.");
    return null;
  }
  try {
    const response = await ai.models.generateContent({
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
    console.warn("No image data found in Gemini response for asset generation.");
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
        // Fix: responseModalities must be an array with a single `Modality.IMAGE` element for image editing.
        responseModalities: [Modality.IMAGE],
      },
    };

    const response = await ai.models.generateContent(request);
    
    const firstCandidate = response.candidates?.[0];
    if (firstCandidate?.content?.parts) {
      for (const part of firstCandidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    console.warn("No image data found in Gemini response for scene composition.");
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
