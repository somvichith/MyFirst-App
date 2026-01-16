
export enum AppTab {
  VOICE = 'voice',
  CHAT = 'chat',
  VISION = 'vision',
  IMAGE = 'image'
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
