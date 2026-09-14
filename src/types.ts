export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  projectType?: string;
  requirements?: string;
  language?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: string;
  audioAvailable?: boolean;
  language?: string;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'error';
