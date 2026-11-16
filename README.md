# Vibha — Lightweight Desktop AI Assistant

<p align="center">
  <img src="resources/icons/icon.png" alt="Vibha Logo" width="120" height="120" style="border-radius: 24px;" />
</p>

<p align="center">
  <b>An always-on-top, privacy-first Windows desktop AI assistant with instant screen capture and BYOK providers.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue" alt="Platform: Windows" />
  <img src="https://img.shields.io/badge/Electron-45-47848F?logo=electron&logoColor=white" alt="Electron 45" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Tests-27%2F27%20Passed-emerald" alt="Tests: 27/27 Passed" />
</p>

---

## What is Vibha?

**Vibha** is a lightweight, frameless Windows desktop AI companion designed to stay out of your way until summoned. It floats unobtrusively on your screen as a 60px movable orb, expands into a sleek 400×550px chat window via `Ctrl+Space` (or clicking the orb), and sits in your Windows system tray.

Vibha operates strictly on a **Bring Your Own Key (BYOK)** model. You use your own API keys directly with your preferred AI providers — no subscriptions, no middleman proxy servers, and no hidden token markups.

---

## Key Features

- **Bring Your Own Key (BYOK)**:
  - **Google Gemini**: Full support for Gemini 2.5 Flash, Gemini Pro, and vision models.
  - **Groq**: Ultra-low-latency inference with Llama 3.3 70B, Llama 3.1 8B, and vision-capable models (Qwen).
  - **OpenAI-Compatible**: Connect to standard OpenAI endpoints, Ollama, LM Studio, vLLM, DeepSeek, or any self-hosted model with custom baseURL.
- **Privacy & Security First**:
  - **OS-Level Credential Vault**: API keys are encrypted at rest using Windows DPAPI via Electron's `safeStorage` in `userData/credentials.enc.json`. Raw keys never touch the renderer, `localStorage`, or logs.
  - **RAM-Only Ephemeral State**: Conversations and screen captures live only in memory. Clicking "New Chat", collapsing to tray, or exiting immediately wipes all session history from RAM.
- **Redesigned Modern Chat Interface**:
  - **Avatar Welcome State**: When you open Vibha, the avatar is featured front-and-center with an ambient glowing halo, online indicator, and quick-action starter pills (Screen capture, explain, summarize, code help).
  - **Seamless Conversation Transition**: As soon as you ask a question or send a screenshot, the welcome screen fades out and the active chat thread appears.
  - **Assistant Identity**: Assistant responses display the mini Vibha avatar, real-time typing/thinking indicators, and syntax-highlighted code blocks with one-click copy.
- **Multi-Mode Screen Capture**:
  - **Custom Rectangular Area**: Drag to select any region of any screen.
  - **Full Monitor**: Multi-monitor DPI-aware capture (125%, 150%, 200% Windows display scaling).
  - **Active Window**: Capture specific open application windows.
  - **Vision Auto-Routing**: Automatically guides you to vision-capable models when screenshots are attached.
- **Windows System Tray & Shortcut Recovery**:
  - Sits in the Windows system notification area with menu options: *Open Vibha*, *Hide Vibha*, *Settings*, and *Quit Vibha*.
  - Configurable global toggle shortcut (default: `Ctrl+Space`) with OS conflict detection, alternative shortcut recommendations, and auto-recovery after system resume.
  - Closing or hiding the window keeps Vibha running in the tray; quitting terminates all processes cleanly.

---

## How to Run Locally

Follow these instructions to clone, install, and run Vibha on your local Windows machine.

### Prerequisites

- **Operating System**: Windows 10 or Windows 11 (64-bit).
- **Node.js**: Version 20.x or higher (LTS recommended).
- **Package Manager**: [pnpm](https://pnpm.io/) (recommended: `corepack enable pnpm` or `npm install -g pnpm`) or `npm`.
- **API Key**: An API key from [Google AI Studio](https://aistudio.google.com/), [Groq Console](https://console.groq.com/), or an OpenAI / Ollama compatible endpoint.

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/kalyan-dasari/floating-ai.git
cd floating-ai
```

---

### Step 2: Install Dependencies

```bash
pnpm install
# or: npm install
```

---

### Step 3: Run the Desktop App in Development Mode

This command compiles the Electron main and preload scripts, starts the Vite dev server with hot module reloading (HMR), and launches the desktop app:

```bash
pnpm run dev:electron
# or: npm run dev:electron
```

*Note: Once launched, the floating orb will appear on your screen. Click it or press `Ctrl+Space` to expand the chat panel.*

---

### Step 4: Configure Your BYOK API Key

1. Expand the Vibha chat panel.
2. Click the **Gear icon (Settings)** in the top-right header (or click **Configure API Key** on the welcome screen).
3. Select your provider (**Google Gemini**, **Groq**, or **OpenAI-Compatible**).
4. Paste your API key and click **Save Key**.
5. Select your desired model (e.g., `gemini-2.5-flash` or `llama-3.1-8b-instant`).
6. Click **Test Connection** to verify your key works.
7. Return to the chat and start asking questions or attaching screen captures!

---

### Step 5: (Optional) Run Renderer Only in Web Browser

To inspect or style the UI inside your web browser without native desktop APIs:

```bash
pnpm run dev
# or: npm run dev
```

Visit `http://localhost:3000`. In browser preview mode:
- Press `Ctrl+Space` to toggle between the floating orb and chat panel.
- Drag the header or orb to reposition the preview.
*(Note: Screen capture and DPAPI encryption require the native Electron runtime via `pnpm run dev:electron`.)*

---

## Automated Testing & Linting

Vibha includes a comprehensive test suite across security, AI provider adapters, DPI cropping, tray integration, and shortcut recovery:

```bash
# Run TypeScript type-checking (0 errors)
pnpm run lint

# Run all 27 Vitest unit & integration tests
pnpm run test
```

### What the Tests Verify

| Test Suite | File | Verified Capabilities |
|---|---|---|
| **Shortcut Recovery** | `tests/shortcutRecovery.test.ts` | Conflict detection, alternative suggestions, re-registration after system resume, clean quit teardown |
| **System Tray** | `tests/trayService.test.ts` | Single tray enforcement, tooltip, menu actions, click-toggle, full resource destruction |
| **Security Vault** | `tests/security.test.ts` | Refusal of plaintext fallback, DPAPI encryption, SSRF protection against cloud metadata IPs |
| **AI Providers** | `tests/aiProviders.test.ts` | SSE streaming, AbortController cancellation, vision model enforcement (no silent dropping of screenshots) |
| **DPI Screen Crop** | `tests/cropService.test.ts` | Accurate crop under 125%, 150%, 200% Windows DPI scaling, boundary clamping, sub-8px click rejection |
| **Ephemeral Chat** | `tests/chatStore.test.ts` | Strictly in-memory RAM store, no localStorage leaks, complete purge on New Chat |

---

## Packaging the Windows Desktop Installer

To produce a production-ready Windows NSIS installer or unpacked executable:

### 1. Build Production Bundles

```bash
pnpm run build
pnpm run build:electron
```

### 2. Package the Windows App

```bash
# Option A: Package unpacked standalone folder in release/win-unpacked/
pnpm exec electron-builder --win --dir --config.electronDist=node_modules/electron/dist

# Option B: Build complete NSIS 64-bit installer (.exe)
pnpm run dist:win
```

### Output Artifacts
- **Standalone Executable**: `release/win-unpacked/Vibha.exe`
- **Windows NSIS Installer**: `release/Vibha-Setup-1.0.0.exe`

The packaged app automatically includes:
- Embedded multi-resolution icon assets (`resources/icons/icon.ico`) with 256, 128, 64, 48, 32, and 16px resolutions.
- Start Menu & Desktop shortcuts.
- Native Windows uninstall entry.
- Zero bundled credentials or secret keys.

---

## Project Structure

```
floating-ai/
├── electron/
│   ├── main/
│   │   ├── index.ts               # Main process entry point & IPC registration
│   │   ├── appLifecycle.ts        # Single-instance lock, shortcut recovery, resume listener
│   │   └── windowManager.ts       # Frameless window lifecycle & DPI work-area clamping
│   ├── preload/
│   │   └── index.ts               # Context isolation bridge exposing typed APIs
│   ├── ipc/
│   │   ├── chatHandlers.ts        # Streaming chat & token cancellation IPC
│   │   ├── captureHandlers.ts     # Screen, window, and area capture IPC
│   │   └── settingsHandlers.ts    # Secure credential vault & settings IPC
│   ├── services/
│   │   ├── ai/                    # Gemini, Groq, and OpenAI provider adapters
│   │   ├── screen/                # desktopCapturer orchestration & DPI cropping
│   │   ├── security/              # safeStorage DPAPI vault & SSRF validators
│   │   └── tray/                  # Windows notification area tray integration
│   └── windows/                   # Frameless window builders (widget, chat, capture overlay)
├── resources/
│   └── icons/                     # Application icons (icon.png, icon.ico, icon.svg)
├── scripts/
│   ├── build-electron.mjs         # esbuild packager for main & preload scripts
│   ├── dev-electron.mjs           # Development runner stripping ELECTRON_RUN_AS_NODE
│   └── generate-ico.ps1           # Multi-resolution Windows ICO generator (.NET)
├── src/                           # React 19 Frontend
│   ├── components/                # ChatPanel, ChatHeader, ChatInput, MessageList, FloatingOrb, etc.
│   ├── hooks/                     # useChat, useCapture, useSettings, useWindowDrag
│   ├── services/                  # Electron bridge & client image helpers
│   ├── stores/                    # Ephemeral RAM-only Zustand store
│   └── types/                     # Shared TypeScript definitions
└── tests/                         # Vitest suite (27 tests)
```

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev:electron` | `pnpm run dev:electron` | Run complete Electron desktop application in local development mode |
| `dev` | `pnpm run dev` | Run Vite frontend only in web browser (`http://localhost:3000`) |
| `test` | `pnpm run test` | Run Vitest unit & integration test suite |
| `lint` | `pnpm run lint` | Run TypeScript compiler (`tsc --noEmit`) type-checking |
| `build` | `pnpm run build` | Build React client for production into `dist/` |
| `build:electron` | `pnpm run build:electron` | Bundle Electron main & preload scripts into `dist-electron/` |
| `build:icon` | `pnpm run build:icon` | Generate multi-resolution `icon.ico` from `icon.png` using PowerShell |
| `dist:win` | `pnpm run dist:win` | Package full Windows NSIS installer into `release/` |
| `clean` | `pnpm run clean` | Clean build and release directories (`dist`, `dist-electron`, `release`) |

---

## Security Architecture

1. **Strict Context Isolation**: Renderer runs in sandboxed mode (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`).
2. **SSRF Protection**: Custom base URLs are validated to only permit `https:` or local loopback addresses (`http://localhost`, `http://127.0.0.1`). Link-local, AWS/GCP metadata endpoints (`169.254.169.254`), and user-credentialed URLs are blocked.
3. **Encrypted Vault**: Credentials are saved in `%APPDATA%/Vibha/credentials.enc.json` encrypted using the Windows DPAPI key tied to the logged-in Windows user account.
4. **No Remote Telemetry**: Vibha transmits data only directly to the AI endpoints you explicitly configure.

---

## License

Private / Proprietary. All rights reserved.
