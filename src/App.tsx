
import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Asset, Product, ResultScene, AssetCreationForm } from './types';
import { AssetType, SceneCreatorMode } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { generateAsset, composeOrEditScene, imageToPart, isApiConfigured } from './services/geminiService';
import { MagicIcon, SaveIcon, FolderOpenIcon, FilePlusIcon, RefreshIcon, EyeIcon, DownloadIcon, TrashIcon, PlayIcon } from './components/Icons';
import { FullScreenSpinner } from './components/Spinner';
import Card from './components/Card';
import Modal from './components/Modal';
import type { Part } from '@google/genai';

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

const StoryboardEditor = forwardRef<StoryboardEditorHandle>((props, ref) => {
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
                    disabled={sceneCreatorMode === SceneCreatorMode.IDLE || !isApiConfigured}
                />
                <button onClick={() => handleGenerateScene(prompt)} disabled={!canCreate || isLoading || !isApiConfigured} className="btn-primary w-full">
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
                    <CreativeStudio onCreate={handleCreateAsset} disabled={isLoading || !isApiConfigured} />
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

// Main App
const App: React.FC = () => {
    const storyboardActionsRef = useRef<StoryboardEditorHandle>(null);
    
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
        <style>{`
          .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            border-radius: 0.375rem;
            background-color: #3b82f6;
            color: white;
            transition: background-color 0.2s;
            border: 1px solid transparent;
          }
          .btn-primary:hover {
            background-color: #2563eb;
          }
          .btn-primary:disabled {
            background-color: #4b5563;
            cursor: not-allowed;
            opacity: 0.7;
          }
          .btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.5rem 1rem;
            font-weight: 600;
            border-radius: 0.375rem;
            background-color: #4b5563;
            color: white;
            transition: background-color 0.2s;
            border: 1px solid #6b7280;
          }
          .btn-secondary:hover {
            background-color: #6b7280;
          }
        `}</style>
        <header className="bg-gray-800/50 backdrop-blur-sm p-4 fixed top-0 left-0 right-0 z-40 border-b border-gray-700">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-wider">AI Storyboard Studio</h1>
                <div className="flex items-center space-x-4">
                    <ProjectManagementMenu
                        onSave={() => storyboardActionsRef.current?.saveProject()}
                        onOpen={() => storyboardActionsRef.current?.openProject()}
                        onNew={() => storyboardActionsRef.current?.newProject()}
                    />
                </div>
            </div>
        </header>

        <main className="pt-24">
            {!isApiConfigured && (
                 <div className="container mx-auto px-4 pb-4 text-center">
                    <div className="bg-yellow-800 border border-yellow-600 text-yellow-100 px-4 py-3 rounded-lg relative" role="alert">
                        <strong className="font-bold">Cảnh báo Cấu hình: </strong>
                        <span className="block sm:inline">Khóa API Gemini chưa được thiết lập. Các tính năng AI sẽ bị vô hiệu hóa.</span>
                    </div>
                </div>
            )}
            <StoryboardEditor ref={storyboardActionsRef} />
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

export default App;
