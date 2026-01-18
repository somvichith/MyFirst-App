
export enum AppTab {
  VOICE = 'voice',
  CHAT = 'chat',
  VISION = 'vision',
  IMAGE = 'image',
  CLOTH_SWAP = 'cloth_swap'
}

export enum Language {
  KHMER = 'km',
  ENGLISH = 'en',
  JAPANESE = 'ja',
  CHINESE = 'zh'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface VisionResult {
  description: string;
  ocrText?: string;
  imageUrl: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export interface DocElement {
  type: 'paragraph' | 'heading' | 'list' | 'table';
  content: string;
  level?: number;
  font?: string; // e.g., 'Khmer OS Moul', 'Khmer OS Siemreap'
}
