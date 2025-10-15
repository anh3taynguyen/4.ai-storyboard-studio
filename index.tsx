
import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentParameters, Part } from '@google/genai';

// ==================================================================================
// START: Bundled content from types.ts
// ==================================================================================
interface Asset {
  id: string;
  src: string; // base64 data URL
  prompt?: string;
  type: 'ai' | 'upload';
}

interface Product {
  id: string;
  src: string; // base64 data URL
}

interface ResultScene {
  id: string;
  src: string; // base64 data URL
}

enum AssetType {
  CHARACTER = 'Người',
  ANIMAL = 'Động vật',
  SCENE = 'Cảnh vật',
  GAME_CHARACTER = 'Nhân vật Game',
  ANIME_CHARACTER = 'Nhân vật Anime',
  THREE_D_CHARACTER = 'Nhân vật Hoạt hình 3D',
}

enum SceneCreatorMode {
  IDLE = 'IDLE',
  NEW = 'NEW',
  PRODUCT_AD = 'PRODUCT_AD',
  FROM_RESULT = 'FROM_RESULT',
  FROM_CHARACTER = 'FROM_CHARACTER',
}

interface AssetCreationForm {
  assetType: AssetType;
  description: string;
  race: string;
  gender: string;
}
// ==================================================================================
// END: Bundled content from types.ts
// ==================================================================================


// ==================================================================================
// START: Bundled content from hooks/useLocalStorage.ts
// ==================================================================================
function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore = JSON.stringify(storedValue);
      window.localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
// ==================================================================================
// END: Bundled content from hooks/useLocalStorage.ts
// ==================================================================================


// ==================================================================================
// START: Bundled content from services/geminiService.ts
// ==================================================================================
let ai: GoogleGenAI | null = null;

const initializeGemini = (apiKey: string) => {
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

const generateAsset = async (prompt: string): Promise<string | null> => {
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

const composeOrEditScene = async (parts: (string | Part)[]): Promise<string | null> => {
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

const imageToPart = async (src: string): Promise<Part> => {
    return {
        inlineData: {
            data: src.split(',')[1],
            mimeType: getMimeType(src)
        }
    };
};
// ==================================================================================
// END: Bundled content from services/geminiService.ts
// ==================================================================================


// ==================================================================================
// START: Bundled content from components/Icons.tsx
// ==================================================================================
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);
const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120 12M20 20l-1.5-1.5A9 9 0 004 12" />
    </svg>
);
const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const MagicIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);
const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
const FolderOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
  );
const FilePlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
// ==================================================================================
// END: Bundled content from components/Icons.tsx
// ==================================================================================


// ==================================================================================
// START: Bundled content from components/Spinner.tsx
// ==================================================================================
const FullScreenSpinner: React.FC<{ message: string }> = ({ message }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col justify-center items-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-lg text-white font-semibold">{message}</p>
    </div>
);
// ==================================================================================
// END: Bundled content from components/Spinner.tsx
// ==================================================================================


// ==================================================================================
// START: Bundled content from components/Modal.tsx
// ==================================================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
// ==================================================================================
// END: Bundled content from components/Modal.tsx
// ==================================================================================


// ==================================================================================
// START: Bundled content from components/Card.tsx
// ==================================================================================
interface CardAction {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
}
interface CardProps {
  src: string;
  isSelected: boolean;
  onSelect: () => void;
  actions: CardAction[];
  children?: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}
const Card: React.FC<CardProps> = ({ src, isSelected, onSelect, actions, children, draggable, onDragStart, onDragOver, onDrop, onDragEnter, onDragEnd }) => {
  return (
    <div
      className={`relative group border-2 rounded-lg overflow-hidden transition-all duration-200 ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-700 hover:border-gray-500'}`}
      onClick={onSelect}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
    >
      <img src={src} alt="card content" className="w-full h-full object-cover aspect-square" />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex justify-center items-center">
        <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className="p-1.5 bg-gray-800 bg-opacity-70 rounded-full text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
};
// ==================================================================================
// END: Bundled content from components/Card.tsx
// ==================================================================================


// Helper for file uploads
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

// Helper to download files
const downloadImage = (src: string, filename = 'storyboard-asset.png') => {
  const link = document.createElement('a');
  link.href = src;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


const CreativeStudio: React.FC<{
  onCreate: (form: AssetCreationForm) => void;
  disabled: boolean;
}> = ({ onCreate, disabled }) => {
  const [form, setForm] = useState<AssetCreationForm>({
    assetType: AssetType.CHARACTER,
    description: '',
    race: 'Châu Á',
    gender: 'Nữ',
  });

  const handleCreate = () => {
    if (form.description) {
      onCreate(form);
    }
  };
  
  const isHumanType = form.assetType === AssetType.CHARACTER;

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col space-y-3">
      <h2 className="text-xl font-semibold">Xưởng Sáng Tạo</h2>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Loại Tài Sản</label>
        <select value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value as AssetType })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <textarea
        placeholder="Mô tả tài sản..."
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-20 text-sm"
      />

      {isHumanType && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Chủng tộc</label>
            <select value={form.race} onChange={e => setForm({ ...form, race: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                <option>Châu Á</option>
                <option>Da đen</option>
                <option>Da trắng</option>
                <option>Hispanic/Latinx</option>
                <option>Trung Đông</option>
                <option>Nam Á</option>
                <option>Đông Nam Á</option>
                <option>Đảo Thái Bình Dương</option>
                <option>Bản địa</option>
                <option>Đa chủng tộc</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Giới tính</label>
            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
                <option>Nữ</option>
                <option>Nam</option>
            </select>
          </div>
        </div>
      )}

      <button onClick={handleCreate} disabled={disabled || !form.description} className="btn-primary w-full mt-2">
        <MagicIcon /> Tạo
      </button>
    </div>
  );
};

export interface StoryboardEditorHandle {
    saveProject: () => void;
    openProject: () => void;
    newProject: () => void;
}

const StoryboardEditor = forwardRef<StoryboardEditorHandle, { apiKey: string }>(({ apiKey }, ref) => {
    const [assets, setAssets] = useLocalStorage<Asset[]>(`sb-assets`, []);
    const [products, setProducts] = useLocalStorage<Product[]>(`sb-products`, []);
    const [results, setResults] = useLocalStorage<ResultScene[]>(`sb-results`, []);
    
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [continueScene, setContinueScene] = useState<ResultScene | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const assetUploadRef = useRef<HTMLInputElement>(null);
    const productUploadRef = useRef<HTMLInputElement>(null);
    const projectOpenRef = useRef<HTMLInputElement>(null);

    const sceneCreatorMode = useCallback((): SceneCreatorMode => {
        const selectedAssetsCount = selectedAssetIds.length;
        if (selectedResultId) return SceneCreatorMode.FROM_RESULT;
        if (selectedAssetsCount > 1 && !selectedProductId) return SceneCreatorMode.FROM_CHARACTER;
        if (selectedAssetsCount === 1 && selectedProductId) return SceneCreatorMode.PRODUCT_AD;
        if (selectedAssetsCount > 0) return SceneCreatorMode.NEW;
        return SceneCreatorMode.IDLE;
    }, [selectedAssetIds, selectedProductId, selectedResultId])();
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'asset' | 'product') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            const id = crypto.randomUUID();
            if (type === 'asset') {
                setAssets(prev => [...prev, { id, src: base64, type: 'upload' }]);
            } else {
                setProducts(prev => [...prev, { id, src: base64 }]);
            }
            e.target.value = '';
        }
    };
    
    const handleCreateAsset = async (form: AssetCreationForm) => {
        setLoadingMessage('Đang tạo tài sản mới...');
        setIsLoading(true);
        let prompt = `Create a high-quality, detailed image of a ${form.assetType}: ${form.description}.`;

        const characterTypes = [
            AssetType.CHARACTER,
            AssetType.ANIMAL,
            AssetType.GAME_CHARACTER,
            AssetType.ANIME_CHARACTER,
            AssetType.THREE_D_CHARACTER,
        ];

        if (form.assetType === AssetType.CHARACTER) {
             prompt += ` Gender: ${form.gender}. Race: ${form.race}.`;
        }

        if (characterTypes.includes(form.assetType)) {
            prompt += ` The asset should be on a plain white background, full body shot, with no shadows, suitable for compositing.`;
        }

        const newAssetSrc = await generateAsset(prompt);
        if (newAssetSrc) {
            setAssets(prev => [...prev, { id: crypto.randomUUID(), src: newAssetSrc, prompt, type: 'ai' }]);
        }
        setIsLoading(false);
    };

    const handleRegenerateAsset = async (prompt: string) => {
        if (!editingAsset) return;
        setLoadingMessage('Đang tạo lại tài sản...');
        setIsLoading(true);
        setEditingAsset(null);
        const imagePart = await imageToPart(editingAsset.src);
        const newSrc = await composeOrEditScene([imagePart, prompt]);
        if (newSrc) {
            setAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...a, src: newSrc } : a));
        }
        setIsLoading(false);
    };

    const handleContinueScene = async (prompt: string) => {
        if (!continueScene) return;
        setLoadingMessage('Đang tiếp tục cảnh...');
        setIsLoading(true);
        setContinueScene(null);
        const imagePart = await imageToPart(continueScene.src);
        const newSrc = await composeOrEditScene([imagePart, `Continue the scene. ${prompt}`]);
        if (newSrc) {
            setResults(prev => [...prev, { id: crypto.randomUUID(), src: newSrc }]);
        }
        setIsLoading(false);
    };

    const handleGenerateScene = async (prompt: string) => {
        if (!prompt) return;
        
        setIsLoading(true);
        setLoadingMessage('Đang dựng cảnh của bạn...');
        
        const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id));
        const selectedProduct = products.find(p => p.id === selectedProductId);
        const selectedResult = results.find(r => r.id === selectedResultId);

        let parts: (Part | string)[] = [];

        switch (sceneCreatorMode) {
            case SceneCreatorMode.NEW:
                parts = await Promise.all(selectedAssets.map(a => imageToPart(a.src)));
                parts.push(`Create a new scene featuring the provided character(s). Scene description: ${prompt}`);
                break;
            case SceneCreatorMode.PRODUCT_AD:
                if (selectedAssets[0] && selectedProduct) {
                    parts = await Promise.all([
                        imageToPart(selectedAssets[0].src),
                        imageToPart(selectedProduct.src)
                    ]);
                    parts.push(`Create a product advertisement scene. The character provided should be interacting with or showcasing the product. Scene description: ${prompt}`);
                }
                break;
            case SceneCreatorMode.FROM_RESULT:
                if(selectedResult) {
                    parts = await Promise.all([imageToPart(selectedResult.src)]);
                    parts.push(`Edit the provided scene based on the following instruction: ${prompt}`);
                }
                break;
            case SceneCreatorMode.FROM_CHARACTER:
                 parts = await Promise.all(selectedAssets.map(a => imageToPart(a.src)));
                 parts.push(`Create a scene with the following characters interacting: ${prompt}`);
                 break;
        }

        if (parts.length > 0) {
            const newSrc = await composeOrEditScene(parts);
            if (newSrc) {
                setResults(prev => [...prev, { id: crypto.randomUUID(), src: newSrc }]);
                setSelectedAssetIds([]);
                setSelectedProductId(null);
                setSelectedResultId(null);
            }
        }
        
        setIsLoading(false);
    };

    const handleSaveProject = () => {
        const projectData = {
            assets,
            products,
            results,
            version: 1,
        };
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        downloadImage(url, 'ai-storyboard-project.json');
        URL.revokeObjectURL(url);
    };

    const handleOpenProject = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    if(data.version === 1 && data.assets && data.products && data.results) {
                        setAssets(data.assets);
                        setProducts(data.products);
                        setResults(data.results);
                    } else {
                        alert('Tệp dự án không hợp lệ hoặc không tương thích.');
                    }
                } catch (err) {
                    alert('Không thể tải dự án.');
                    console.error(err);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        }
    };

    const handleNewProject = () => {
        if(window.confirm('Bạn có chắc muốn bắt đầu một dự án mới không? Mọi tiến trình chưa được lưu sẽ bị mất.')) {
            setAssets([]);
            setProducts([]);
            setResults([]);
            setSelectedAssetIds([]);
            setSelectedProductId(null);
            setSelectedResultId(null);
        }
    };
    
    useImperativeHandle(ref, () => ({
        saveProject: handleSaveProject,
        openProject: () => projectOpenRef.current?.click(),
        newProject: handleNewProject,
    }));

    const SceneCreator: React.FC = () => {
        const [prompt, setPrompt] = useState('');

        const getTitle = () => {
             switch (sceneCreatorMode) {
                case SceneCreatorMode.NEW: return 'Tạo Cảnh Mới';
                case SceneCreatorMode.PRODUCT_AD: return 'Tạo Quảng Cáo Sản Phẩm';
                case SceneCreatorMode.FROM_RESULT: return 'Chỉnh Sửa hoặc Tiếp Tục Cảnh';
                case SceneCreatorMode.FROM_CHARACTER: return 'Tạo Cảnh Tương Tác';
                default: return 'Công Cụ Tạo Cảnh';
            }
        }

        const getPlaceholder = () => {
            switch (sceneCreatorMode) {
                case SceneCreatorMode.NEW: return 'Mô tả cảnh bạn muốn tạo...';
                case SceneCreatorMode.PRODUCT_AD: return 'Mô tả quảng cáo sản phẩm...';
                case SceneCreatorMode.FROM_RESULT: return 'Mô tả thay đổi hoặc phần tiếp theo của cảnh...';
                case SceneCreatorMode.FROM_CHARACTER: return 'Mô tả sự tương tác giữa các nhân vật...';
                default: return 'Chọn một tài sản để bắt đầu';
            }
        }

        const getButtonText = () => {
             switch (sceneCreatorMode) {
                case SceneCreatorMode.FROM_RESULT: return 'Sửa / Tiếp Tục';
                default: return 'Tạo Cảnh';
            }
        }

        const canCreate = (sceneCreatorMode !== SceneCreatorMode.IDLE) && prompt.length > 0;

        return (
             <div className="bg-gray-800 rounded-lg p-4 flex flex-col space-y-3">
                <h2 className="text-xl font-semibold">{getTitle()}</h2>
                <textarea
                    placeholder={getPlaceholder()}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-24 text-sm"
                    disabled={sceneCreatorMode === SceneCreatorMode.IDLE || !apiKey}
                />
                <button onClick={() => handleGenerateScene(prompt)} disabled={!canCreate || isLoading || !apiKey} className="btn-primary w-full">
                    <MagicIcon /> {getButtonText()}
                </button>
            </div>
        )
    };

    const toggleSelection = (id: string, type: 'asset' | 'product' | 'result') => {
        if (type === 'asset') {
            setSelectedAssetIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
            setSelectedResultId(null);
        } else if (type === 'product') {
            setSelectedProductId(prev => prev === id ? null : id);
            setSelectedResultId(null);
        } else {
            setSelectedResultId(prev => prev === id ? null : id);
            setSelectedAssetIds([]);
            setSelectedProductId(null);
        }
    };

    const handleDelete = (id: string, type: 'asset' | 'product' | 'result') => {
        if (type === 'asset') setAssets(prev => prev.filter(a => a.id !== id));
        if (type === 'product') setProducts(prev => prev.filter(p => p.id !== id));
        if (type === 'result') setResults(prev => prev.filter(r => r.id !== id));
    };
    
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleSort = () => {
        if(dragItem.current === null || dragOverItem.current === null) return;
        const resultsCopy = [...results];
        const [reorderedItem] = resultsCopy.splice(dragItem.current, 1);
        resultsCopy.splice(dragOverItem.current, 0, reorderedItem);
        setResults(resultsCopy);
        dragItem.current = null;
        dragOverItem.current = null;
    };


  return (
        <>
            {isLoading && <FullScreenSpinner message={loadingMessage} />}
            {previewImage && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Preview" className="max-w-4/5 max-h-4/5 object-contain" />
                </div>
            )}
            <Modal title="Tạo Lại Tài Sản" isOpen={!!editingAsset} onClose={() => setEditingAsset(null)}>
                <AssetEditor asset={editingAsset} onSave={handleRegenerateAsset} onCancel={() => setEditingAsset(null)} />
            </Modal>
            <Modal title="Tiếp Tục Cảnh" isOpen={!!continueScene} onClose={() => setContinueScene(null)}>
                <SceneContinuator scene={continueScene} onSave={handleContinueScene} onCancel={() => setContinueScene(null)} />
            </Modal>
            
            <input type="file" ref={projectOpenRef} onChange={handleOpenProject} accept=".json" style={{ display: 'none' }} />
            
            <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                 <aside className="lg:col-span-3 flex flex-col space-y-6">
                    <CreativeStudio onCreate={handleCreateAsset} disabled={isLoading || !apiKey} />
                    <SceneCreator />
                </aside>

                <div className="lg:col-span-9">
                    {/* Asset Library */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold">Thư Viện Tài Sản</h2>
                            <div>
                                <button onClick={() => assetUploadRef.current?.click()} className="btn-secondary">Tải Lên Tài Sản</button>
                                <input type="file" ref={assetUploadRef} onChange={(e) => handleFileChange(e, 'asset')} accept="image/*" style={{ display: 'none' }} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {assets.map(asset => (
                                <Card 
                                    key={asset.id}
                                    src={asset.src}
                                    isSelected={selectedAssetIds.includes(asset.id)}
                                    onSelect={() => toggleSelection(asset.id, 'asset')}
                                    actions={[
                                        { icon: <EyeIcon />, onClick: () => setPreviewImage(asset.src), label: 'Xem trước' },
                                        { icon: <DownloadIcon />, onClick: () => downloadImage(asset.src, `asset-${asset.id}.png`), label: 'Tải xuống' },
                                        ...(asset.type === 'ai' ? [{ icon: <RefreshIcon />, onClick: () => setEditingAsset(asset), label: 'Tạo lại' }] : []),
                                        { icon: <TrashIcon />, onClick: () => handleDelete(asset.id, 'asset'), label: 'Xóa' },
                                    ]}
                                />
                            ))}
                        </div>
                    </section>
                    
                    {/* Product Library */}
                    <section className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold">Thư Viện Sản Phẩm</h2>
                            <div>
                                <button onClick={() => productUploadRef.current?.click()} className="btn-secondary">Tải Lên Sản Phẩm</button>
                                <input type="file" ref={productUploadRef} onChange={(e) => handleFileChange(e, 'product')} accept="image/*" style={{ display: 'none' }} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {products.map(product => (
                                <Card 
                                    key={product.id}
                                    src={product.src}
                                    isSelected={selectedProductId === product.id}
                                    onSelect={() => toggleSelection(product.id, 'product')}
                                    actions={[
                                        { icon: <EyeIcon />, onClick: () => setPreviewImage(product.src), label: 'Xem trước' },
                                        { icon: <DownloadIcon />, onClick: () => downloadImage(product.src, `product-${product.id}.png`), label: 'Tải xuống' },
                                        { icon: <TrashIcon />, onClick: () => handleDelete(product.id, 'product'), label: 'Xóa' },
                                    ]}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Storyboard / Results */}
                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold mb-4">Bảng Phân Cảnh</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {results.map((result, index) => (
                            <Card
                                    key={result.id}
                                    src={result.src}
                                    isSelected={selectedResultId === result.id}
                                    onSelect={() => toggleSelection(result.id, 'result')}
                                    draggable
                                    onDragStart={() => dragItem.current = index}
                                    onDragEnter={() => dragOverItem.current = index}
                                    onDragEnd={handleSort}
                                    onDragOver={(e) => e.preventDefault()}
                                    actions={[
                                        { icon: <EyeIcon />, onClick: () => setPreviewImage(result.src), label: 'Xem trước' },
                                        { icon: <DownloadIcon />, onClick: () => downloadImage(result.src, `scene-${result.id}.png`), label: 'Tải xuống' },
                                        { icon: <PlayIcon />, onClick: () => setContinueScene(result), label: 'Tiếp tục Cảnh' },
                                        { icon: <TrashIcon />, onClick: () => handleDelete(result.id, 'result'), label: 'Xóa' }
                                    ]}
                                >
                                    <div className="absolute bottom-0 left-0 bg-gray-900 bg-opacity-80 text-white text-lg font-bold p-2 rounded-tr-lg">
                                        {index + 1}
                                    </div>
                                </Card>
                            ))}
                        </div>
                        {results.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                                <p className="text-gray-400">Các cảnh bạn tạo sẽ xuất hiện ở đây.</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
});

const ProjectManagementMenu: React.FC<{
    onSave: () => void;
    onOpen: () => void;
    onNew: () => void;
}> = ({ onSave, onOpen, onNew }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="btn-secondary">
                Dự án
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-700 p-4">
                    <h3 className="text-xl font-bold text-white mb-3">Quản Lý Dự Án</h3>
                    <ul className="space-y-1">
                        <li>
                            <button onClick={() => { onSave(); setIsOpen(false); }} className="w-full text-left px-2 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md flex items-center transition-colors">
                                <SaveIcon /> <span className="ml-3">Lưu Dự Án</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { onOpen(); setIsOpen(false); }} className="w-full text-left px-2 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md flex items-center transition-colors">
                                <FolderOpenIcon /> <span className="ml-3">Mở Dự Án</span>
                            </button>
                        </li>
                        <li>
                            <button onClick={() => { onNew(); setIsOpen(false); }} className="w-full text-left px-2 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md flex items-center transition-colors">
                                <FilePlusIcon /> <span className="ml-3">Dự Án Mới</span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

const ApiKeyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
    currentKey: string;
}> = ({ isOpen, onClose, onSave, currentKey }) => {
    const [key, setKey] = useState(currentKey);

    useEffect(() => {
        setKey(currentKey);
    }, [currentKey, isOpen]);

    const handleSave = () => {
        onSave(key);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Thiết Lập Khóa API Gemini">
            <div className="flex flex-col space-y-4">
                <p className="text-gray-400 text-sm">
                    Bạn có thể lấy khóa API từ Google AI Studio. Khóa được lưu trong bộ nhớ cục bộ của trình duyệt và không được chia sẻ với bất kỳ ai.
                </p>
                <input
                    type="password"
                    placeholder="Nhập Khóa API của bạn"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                />
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="btn-secondary">Hủy</button>
                    <button onClick={handleSave} disabled={!key} className="btn-primary">Lưu Khóa</button>
                </div>
            </div>
        </Modal>
    );
};


// Main App
const App: React.FC = () => {
    const storyboardActionsRef = useRef<StoryboardEditorHandle>(null);
    const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

    useEffect(() => {
        initializeGemini(apiKey);
    }, [apiKey]);

    useEffect(() => {
        // On initial load, if there's no API key, open the modal.
        if (!apiKey) {
            setIsApiKeyModalOpen(true);
        }
    }, []); // Empty dependency array ensures this runs only once on mount.
    
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
        <ApiKeyModal
            isOpen={isApiKeyModalOpen}
            onClose={() => setIsApiKeyModalOpen(false)}
            onSave={setApiKey}
            currentKey={apiKey}
        />
        <header className="bg-gray-800/50 backdrop-blur-sm p-4 fixed top-0 left-0 right-0 z-40 border-b border-gray-700">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-wider">AI Storyboard Studio</h1>
                <div className="flex items-center space-x-4">
                    <ProjectManagementMenu
                        onSave={() => storyboardActionsRef.current?.saveProject()}
                        onOpen={() => storyboardActionsRef.current?.openProject()}
                        onNew={() => storyboardActionsRef.current?.newProject()}
                    />
                    <button onClick={() => setIsApiKeyModalOpen(true)} className="p-2 rounded-md hover:bg-gray-700 transition-colors" title="Cài đặt">
                        <SettingsIcon />
                    </button>
                </div>
            </div>
        </header>

        <main className="pt-20">
            <StoryboardEditor ref={storyboardActionsRef} apiKey={apiKey} />
        </main>
    </div>
  );
};

const AssetEditor: React.FC<{
    asset: Asset | null;
    onSave: (prompt: string) => void;
    onCancel: () => void;
}> = ({ asset, onSave, onCancel }) => {
    const [prompt, setPrompt] = useState('');
    if (!asset) return null;

    return (
        <div className="flex flex-col space-y-4">
            <img src={asset.src} alt="Editing asset" className="rounded-lg max-h-64 w-full object-contain" />
            <textarea
                placeholder="Mô tả những thay đổi bạn muốn thực hiện..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-20 text-sm"
            />
            <div className="flex justify-end space-x-2">
                <button onClick={onCancel} className="btn-secondary">Hủy</button>
                <button onClick={() => onSave(prompt)} className="btn-primary">Lưu Thay Đổi</button>
            </div>
        </div>
    );
}

const SceneContinuator: React.FC<{
    scene: ResultScene | null;
    onSave: (prompt: string) => void;
    onCancel: () => void;
}> = ({ scene, onSave, onCancel }) => {
    const [prompt, setPrompt] = useState('');
    if (!scene) return null;

    return (
        <div className="flex flex-col space-y-4">
            <img src={scene.src} alt="Continuing scene" className="rounded-lg max-h-64 w-full object-contain" />
            <textarea
                placeholder="Mô tả những gì xảy ra tiếp theo trong cảnh..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-20 text-sm"
            />
            <div className="flex justify-end space-x-2">
                <button onClick={onCancel} className="btn-secondary">Hủy</button>
                <button onClick={() => onSave(prompt)} className="btn-primary">Tạo Cảnh Tiếp Theo</button>
            </div>
        </div>
    );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
