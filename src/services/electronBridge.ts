import type { FloatingAIBridge } from '../types/index.ts';

declare global {
  interface Window {
    floatingAI?: FloatingAIBridge;
  }
}

export function isElectronRuntime(): boolean {
  return typeof window !== 'undefined' && typeof window.floatingAI !== 'undefined';
}

export function getBridge(): FloatingAIBridge | null {
  if (typeof window === 'undefined') return null;
  return window.floatingAI ?? null;
}
