# Vibha (Floating AI) — Comprehensive Repository Audit & Status

**Application Name:** Vibha (formerly Floating AI)  
**Target Platform:** Windows 10 / 11 (Electron Desktop)  
**Architecture:** Electron 45 (Main + Preload + Sandboxed ContextBridge) + React 19 + TypeScript + Tailwind CSS v4 + Zustand  
**Status:** Phases 1–4 Complete · Tray & Shortcut Recovery Verified · All 27 Tests Passing  

---

## 1. Executive Summary

This repository contains **Vibha** (Floating AI), an always-on-top, lightweight Windows desktop AI assistant. It provides a compact 60px floating orb that anchors to screen edges and expands on demand (`Ctrl+Space`) into a 400×550px floating chat panel. It supports Bring-Your-Own-Key (BYOK) AI providers (**Google Gemini**, **Groq**, and **OpenAI-Compatible** endpoints) and screen capture (fullscreen, active window, and custom rectangular area).

All 4 development phases have been implemented and verified:
1. **Windows System Tray Integration (`TrayService`)**: Dedicated system tray service with context menu, visibility toggle on click, non-terminating window hiding, clean app quit, and `--hidden` Windows startup support.
2. **Global Shortcut Recovery (`AppLifecycleManager`)**: Robust registration failure detection, conflict reporting, alternative suggestions, user preference preservation (no silent overwrite), and re-registration after system resume.
3. **Settings UI Enhancements (`SettingsPanel`)**: Real-time shortcut registration status badge (Active/Conflict), conflict warning alert banner, clickable alternative suggestions, and persistent user configuration.
4. **Automated Test Suite**: Added 11 new tests across tray management and shortcut recovery (27 total tests across 6 suites). `pnpm run lint`, `pnpm run test`, `pnpm run build`, and `pnpm run build:electron` all pass cleanly.
5. **Groq Model Fallback**: Resolved user 404 `model_not_found` errors on BYOK keys by dynamically discovering accessible models (`llama-3.1-8b-instant`) and retrying seamlessly.

---

## 2. Completed Features

| Feature | Implementation | Verification Details |
|---|---|---|
| **Windows System Tray (`TrayService`)** | `electron/services/tray/trayService.ts` | Dedicated Electron `Tray` and `Menu` implementation with Vibha app icon (`icon.ico` / `icon.png`). Menu items: "Open Vibha", "Hide Vibha", "Settings", separator, "Quit Vibha". Click toggles widget; closing widget hides without quitting app; quit cleanly tears down resources. Prevents duplicate tray instances. Verified in `tests/trayService.test.ts`. |
| **Global Shortcut Recovery** | `electron/main/appLifecycle.ts` | Detects registration failures, captures specific failure errors, and provides recommended alternatives (`Ctrl+Shift+Space`, `Alt+Space`, `Ctrl+Alt+Space`, `Ctrl+Shift+V`, `Ctrl+F12`). Preserves user's configured shortcut without silent rollback. Re-registers on `powerMonitor.on('resume')` and cleans up on quit. Verified in `tests/shortcutRecovery.test.ts`. |
| **Shortcut Configuration UI** | `src/components/SettingsPanel.tsx` | General tab displays current shortcut, active/conflict status badge, conflict alert banner with OS error, input field with Save Shortcut action, and one-click pill buttons for suggested alternatives. Supports opening directly via tray "Settings". |
| **Groq Model Fallback & Discovery** | `electron/services/ai/GroqProvider.ts` | Automatically recovers from 404 `model_not_found` or permission errors by querying the user's BYOK account via `getModels()`, selecting an accessible model (`llama-3.1-8b-instant`), and transparently fulfilling the request. Default updated with disk migration. |
| **Windows Startup (`--hidden`)** | `electron/windows/widgetWindow.ts`, `appLifecycle.ts` | Supports Windows login startup with `--hidden` flag: initializes system tray icon while keeping the floating widget hidden until summoned. |
| **RAM-Only Ephemeral State** | `src/stores/chatStore.ts` | Strictly in-memory Zustand store without `persist` middleware, `localStorage`, or disk logs. All turns, attachments, and deltas clear on "New Chat" or app exit. Verified via `tests/chatStore.test.ts`. |
| **OS-Level Credential Vault** | `electron/services/security/credentialService.ts` | Encrypts API keys via Electron `safeStorage` (Windows DPAPI) in `userData/credentials.enc.json`. Disallows plaintext fallback; never returns raw keys to renderer (exposes only masked hints like `••••9876`). Verified via `tests/security.test.ts`. |
| **IPC & SSRF Protection** | `electron/services/security/validators.ts` | Validates custom OpenAI-compatible endpoints: allows `https:` and local endpoints (`http://localhost`, `http://127.0.0.1`), while strictly blocking link-local/cloud metadata IPs (`169.254.169.254`, `metadata.google.internal`) and embedded credentials. |
| **Multi-Monitor DPI Cropping** | `electron/services/screen/cropService.ts` | Accurately converts DIP coordinates to physical coordinates under Windows Display Scaling (125%, 150%, 200%), clamps bounds, downscales oversized captures, and rejects accidental sub-8px clicks. Verified via `tests/cropService.test.ts`. |
| **Window Geometry & Clamping** | `electron/windows/chatWindow.ts`, `electron/main/windowManager.ts` | Computes expanded bounds from orb corner anchor, clamps inside display `workArea`, remembers session positions, and handles display add/remove/metrics-changed events dynamically. |
| **Streaming AI Adapters** | `electron/services/ai/*` | Full SSE streaming support for Gemini (`generateContentStream`), Groq (`chat.completions.create(stream: true)`), and OpenAI-compatible endpoints with `AbortController` cancellation. Verified via `tests/aiProviders.test.ts`. |
| **Vision Enforcement & Auto-Routing** | `electron/services/ai/AIProvider.ts`, `GroqProvider.ts`, `useChat.ts` | Seamlessly auto-routes screenshot turns to vision-capable models (e.g. `llama-3.2-11b-vision-preview`) when the user is chatting on a fast text model (`llama-3.1-8b-instant`), preserving text speed while enabling instant screenshot analysis without manual configuration toggling. |
| **Electron Sandboxing** | `electron/windows/widgetWindow.ts`, `electron/preload/index.ts` | Context isolation enabled, nodeIntegration disabled, sandbox enabled, web security enabled, window opening denied, navigation restricted to bundle origin. |
| **Frameless Floating Orb UI** | `src/components/FloatingOrb.tsx`, `useWindowDrag.ts` | Custom geometric SVG aperture icon, pointer-capture dragging (>4px movement threshold to avoid swallowing clicks), status ring animation (streaming, error, ready). |
| **Markdown & Code Rendering** | `src/components/MessageBubble.tsx` | Markdown rendering with `remark-gfm` and syntax highlighting with `highlight.js` for both dark and light modes with one-click code copy. |
| **Windows NSIS Build Target** | `electron-builder.yml`, `scripts/build-electron.mjs` | NSIS 64-bit installer definition with customizable installation directory, start menu & desktop shortcuts, and embedded icon generator (`resources/icons/icon.ico`). |

---

## 3. Verification Results

| Check | Command | Status | Details |
|---|---|---|---|
| **TypeScript Typecheck** | `pnpm run lint` (`tsc --noEmit`) | **PASS** | 0 errors across main, preload, renderer, and test files. |
| **Unit Test Suite** | `pnpm run test` (`vitest run`) | **PASS** | 27/27 tests passed across 6 suites (100% success rate). |
| **Renderer Production Build** | `pnpm run build` (`vite build`) | **PASS** | Successfully bundled HTML/CSS/JS client into `dist/`. |
| **Electron Main/Preload Build** | `pnpm run build:electron` | **PASS** | Successfully bundled CJS bundles into `dist-electron/`. |
| **Desktop Launch Verification** | `pnpm run dev:electron` | **PASS** | Verified Electron boots with clean process environment, window opens, tray initializes. |

---

## 4. Test Suite Summary

```
 RUN  v5.1.0 K:/Big Things/floating-ai

 ✓ tests/trayService.test.ts (5 tests)
   - initializes tray with Vibha tooltip and context menu
   - prevents duplicate tray instances when initTray is called repeatedly
   - dispatches tray menu actions to windowManager and quit handler
   - toggles widget visibility when tray icon is clicked
   - completely destroys tray instance on quit/teardown

 ✓ tests/shortcutRecovery.test.ts (6 tests)
   - registers configured global shortcut successfully
   - detects registration failure, reports error, and offers suggested alternatives without silent overwrite
   - properly unregisters previous shortcut when registering a new one
   - re-registers global shortcut and reclamps window display after system resume
   - cleans up resources and unregisters all global shortcuts before app quit
   - does not quit application when windows close unless app is quitting

 ✓ tests/chatStore.test.ts (1 test)
   - maintains ephemeral RAM-only conversation state and purges turns completely on clear

 ✓ tests/security.test.ts (5 tests)
   - refuses plaintext fallback when safeStorage encryption is unavailable
   - encrypts credentials, masks IPC status hints, and never exposes raw keys
   - blocks unsafe URL schemes and cloud metadata IPs while allowing HTTPS and localhost
   - sanitizes partial settings inputs and rejects malformed values
   - rejects malformed chat stream requests

 ✓ tests/cropService.test.ts (6 tests)
   - scales and crops full-screen image buffer to exact DIP bounds under 125% DPI
   - clamps selection bounds within image dimensions
   - rejects selections smaller than min crop threshold
   - downscales images exceeding maximum dimension while preserving aspect ratio
   - formats capture attachment with correct metadata
   - crops high-resolution display buffer under 200% scaling

 ✓ tests/aiProviders.test.ts (4 tests)
   - refuses to silently drop images when a text-only Groq model is selected
   - refuses to silently drop images on OpenAI-compatible text-only model unless overridden
   - generates correct streaming requests and aggregates text responses
   - maps provider credentials and updates dynamic model lists

 Test Files  6 passed (6)
      Tests  27 passed (27)
```

---

## 5. Architecture Summary

```
Vibha Architecture
├── Main Process (Electron 45 / Node.js)
│   ├── index.ts                   -> Application bootstrap & IPC registry
│   ├── appLifecycle.ts            -> Single-instance lock, shortcut registration & recovery, power resume
│   ├── windowManager.ts           -> Geometry calculation, DPI clamping, orb & chat toggle
│   ├── services/
│   │   ├── tray/trayService.ts    -> System tray, context menu, duplicate guard
│   │   ├── ai/                    -> Gemini, Groq (with fallback), OpenAI-Compatible providers
│   │   ├── screen/                -> Monitor info, desktopCapturer, DPI-aware cropService
│   │   └── security/              -> safeStorage DPAPI vault, settingsService, validators
│   └── windows/
│       ├── widgetWindow.ts        -> Frameless, transparent, always-on-top 'screen-saver' window
│       └── captureOverlayWindow.ts-> Transparent multi-monitor overlay for area cropping
├── Preload Process
│   └── index.ts                   -> contextBridge exposing strongly-typed FloatingAIBridge
└── Renderer Process (React 19 + Tailwind v4 + Zustand)
    ├── App.tsx                    -> Root widget and overlay router
    ├── components/
    │   ├── FloatingOrb.tsx        -> Frameless draggable 60px status orb
    │   ├── ChatPanel.tsx          -> Collapsible 400x550px chat window
    │   ├── SettingsPanel.tsx      -> General (shortcut config), Providers, Capture, About
    │   ├── MessageBubble.tsx      -> Markdown + code highlighting
    │   └── CaptureOverlayView.tsx -> Multi-monitor crosshair & drag selection
    └── stores/
        ├── chatStore.ts           -> In-memory RAM-only chat state
        └── settingsStore.ts       -> Safe settings snapshot & provider models
```
