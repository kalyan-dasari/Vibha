import type { AIProviderId, AppSettings } from '../../../shared/types.ts';
import type { CredentialService } from '../security/credentialService.ts';
import { AIProvider, ProviderConfigError } from './AIProvider.ts';
import { GeminiProvider } from './GeminiProvider.ts';
import { GroqProvider } from './GroqProvider.ts';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.ts';

export class ProviderFactory {
  private readonly credentialService: CredentialService;
  private readonly activeRequests = new Map<string, AbortController>();

  constructor(credentialService: CredentialService) {
    this.credentialService = credentialService;
  }

  createProvider(
    providerId: AIProviderId,
    settings: AppSettings,
    overrides?: { apiKeyOverride?: string; customBaseUrlOverride?: string }
  ): AIProvider {
    const apiKey =
      overrides?.apiKeyOverride !== undefined
        ? overrides.apiKeyOverride
        : this.credentialService.getCredentialInternal(providerId) ?? '';

    switch (providerId) {
      case 'gemini':
        return new GeminiProvider(apiKey);
      case 'groq':
        return new GroqProvider(apiKey);
      case 'openai-compatible': {
        const baseUrl =
          overrides?.customBaseUrlOverride !== undefined
            ? overrides.customBaseUrlOverride
            : settings.providers['openai-compatible'].customBaseUrl;
        return new OpenAICompatibleProvider(apiKey, baseUrl);
      }
      default:
        throw new ProviderConfigError(`Unknown provider: ${String(providerId)}`);
    }
  }

  registerRequest(requestId: string): AbortController {
    const existing = this.activeRequests.get(requestId);
    if (existing) {
      existing.abort();
    }
    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);
    return controller;
  }

  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (!controller) return false;
    controller.abort();
    this.activeRequests.delete(requestId);
    return true;
  }

  finishRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  cancelAll(): void {
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
  }
}
