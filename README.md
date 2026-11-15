# Floating AI

A lightweight, always-on-top Windows desktop AI assistant built with **Electron**, **React**, **TypeScript**, **Tailwind CSS**, and **Zustand**.

Floating AI stays out of your way as a 60px floating orb, expands into a compact 400×550px chat panel on demand (`Ctrl+Space`), supports Bring-Your-Own-Key (BYOK) providers (**Google Gemini**, **Groq**, and **OpenAI-Compatible** endpoints), and captures full screens, individual windows, or custom screen regions for visual Q&A.

---

## Architecture Overview

- `electron/main/` — Entry point (`index.ts`), single-instance & global shortcut lifecycle (`appLifecycle.ts`), DPI-safe orb/chat window manager (`windowManager.ts`).
- `electron/windows/` — Secure frameless `BrowserWindow` builders (`widgetWindow.ts`, `chatWindow.ts`, `captureOverlay.ts`).
- `electron/preload/` — Strict `contextBridge` API (`index.ts`) exposing only typed, whitelisted IPC methods.
- `electron/ipc/` — Validated IPC handlers for chat streaming, settings/credentials, and screen capture.
- `electron/services/ai/` — Provider adapter layer (`AIProvider`, `GeminiProvider`, `GroqProvider`, `OpenAICompatibleProvider`, `ProviderFactory`).
- `electron/services/screen/` — `desktopCapturer` orchestration (`captureService.ts`), DPI-aware cropping (`cropService.ts`), multi-monitor inspection (`monitorService.ts`).
- `electron/services/security/` — Electron `safeStorage` credential vault (`credentialService.ts`), non-secret preferences (`settingsService.ts`), and URL/payload validators (`validators.ts`).
- `src/` — React + TypeScript + Tailwind v4 + Zustand (strictly RAM-only chat state) renderer.
- `tests/` — Vitest unit and security test suite.

---

## Installation

```bash
npm install
```

> **Note:** On Windows, Electron's `safeStorage` uses Windows DPAPI to encrypt API keys at rest. Ensure Node.js 20+ is installed.

---

## Development

### Run Electron Desktop App (Windows / Local Desktop)
Starts Vite on `http://localhost:3000`, bundles the Electron main & preload scripts, and launches the Electron desktop window:

```bash
npm run dev:electron
```

### Run Renderer Only (Web Preview)
```bash
npm run dev
```
*Note: Browser preview renders the widget UI only. Native desktop capabilities (`safeStorage`, `desktopCapturer`, `Ctrl+Space` global shortcut, and main-process BYOK API calls) require `npm run dev:electron`.*

---

## Testing & Verification

Run TypeScript type-checking and the Vitest unit/security suite:

```bash
npm run lint
npm test
```

The test suite verifies:
- `safeStorage` encryption enforcement (refuses plaintext fallback when encryption is unavailable)
- Endpoint URL scheme & SSRF validation (`https:` or `http://localhost` only)
- IPC payload & attachment MIME/size validation
- Windows DPI scaling (`1.0x`, `1.5x`, etc.) & multi-monitor work-area clamping
- Provider vision enforcement (never silently strips screenshots for text-only models)
- SSE streaming & `AbortController` request cancellation
- RAM-only Zustand conversation cleanup

---

## Building the Windows Installer

1. Build the React renderer and Electron main/preload bundles:
   ```bash
   npm run build
   npm run build:electron
   ```
2. Package the Windows NSIS installer:
   ```bash
   npm run dist:win
   ```

**Installer Output Location:**
`release/Floating AI-Setup-1.0.0.exe`

The NSIS installer includes:
- Application icon (`resources/icons/icon.ico`)
- Optional installation directory selection
- Start Menu shortcut & optional Desktop shortcut
- Clean uninstaller (`Floating AI`)
- Zero bundled API keys or `.env` files

---

## Security Notes

- **API Key Isolation**: All AI provider requests run strictly in the Electron main process. API keys are encrypted via Electron `safeStorage` (Windows DPAPI) in `userData/credentials.enc.json` and are never exposed to the renderer process, `localStorage`, or logs.
- **No Plaintext Fallback**: If `safeStorage.isEncryptionAvailable()` returns `false`, saving credentials fails explicitly rather than falling back to plaintext storage.
- **BrowserWindow Hardening**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, external navigation blocked, and no raw `ipcRenderer` methods exposed.
- **RAM-Only Conversations**: Chat messages and screenshots exist strictly in memory during the active session and are discarded on Clear, New Chat, or Quit.
- **On-Demand Screen Capture**: Screenshots are captured only when explicitly requested by the user. The Floating AI widget hides briefly during capture so it does not obstruct the screenshot, and temporary image buffers are cleared after encoding.

---

## Known Limitations

- **Linux / Headless Containers**: Cloud sandbox containers (such as web-based IDE environments) cannot execute Windows DPAPI (`safeStorage`) or native desktop `desktopCapturer` windows; export and run `npm run dev:electron` or `npm run dist:win` on a Windows 10/11 machine to verify native desktop behavior.
- **Code Signing**: The generated NSIS installer is unsigned by default; set `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables before running `npm run dist:win` to sign for Windows SmartScreen distribution.
