export * from '../../shared/types.ts';

export type MessageStatus = 'streaming' | 'complete' | 'error' | 'cancelled';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: import('../../shared/types.ts').ImageAttachment[];
  createdAt: number;
  status: MessageStatus;
  errorMessage?: string;
  provider?: import('../../shared/types.ts').AIProviderId;
  model?: string;
}

export type SettingsTabId = 'general' | 'providers' | 'capture' | 'about';
