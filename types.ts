
export interface Asset {
  id: string;
  src: string; // base64 data URL
  prompt?: string;
  type: 'ai' | 'upload';
}

export interface Product {
  id: string;
  src: string; // base64 data URL
}

export interface ResultScene {
  id: string;
  src: string; // base64 data URL
}

export enum AssetType {
  CHARACTER = 'Người',
  ANIMAL = 'Động vật',
  SCENE = 'Cảnh vật',
  GAME_CHARACTER = 'Nhân vật Game',
  ANIME_CHARACTER = 'Nhân vật Anime',
  THREE_D_CHARACTER = 'Nhân vật Hoạt hình 3D',
}

export enum SceneCreatorMode {
  IDLE = 'IDLE',
  NEW = 'NEW',
  PRODUCT_AD = 'PRODUCT_AD',
  FROM_RESULT = 'FROM_RESULT',
  FROM_CHARACTER = 'FROM_CHARACTER',
}

export interface AssetCreationForm {
  assetType: AssetType;
  description: string;
  race: string;
  gender: string;
}
