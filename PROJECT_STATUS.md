# Vibha (Floating AI) — Comprehensive Repository Audit & Status

**Application Name:** Vibha (formerly Floating AI)  
**Target Platform:** Windows 10 / 11 (Electron Desktop)  
**Architecture:** Electron 45 (Main + Preload + Sandboxed ContextBridge) + React 19 + TypeScript + Tailwind CSS v4 + Zustand  
**Audit Date:** November 2026  
**Status:** Audit Complete · Core Initialization & Runtime Verified  

---

## 1. Executive Summary

This repository contains **Vibha** (Floating AI), an always-on-top, lightweight Windows desktop AI assistant. It provides a compact 60px floating orb that anchors to screen edges and expands on demand (`Ctrl+Space`) into a 400×550px floating chat panel. It supports Bring-Your-Own-Key (BYOK) AI providers (**Google Gemini**, **Groq**, and **OpenAI-Compatible** endpoints) and screen capture (fullscreen, active window, and custom rectangular area).

A comprehensive repository audit of all 12 key areas was conducted:
1. Project structure & branding
2. `package.json` & dependency tree
3. Electron main process & lifecycle
4. Preload & IPC security boundaries
5. React renderer & component tree
6. Floating window & multi-monitor geometry
7. AI provider adapters (Gemini, Groq, OpenAI-compatible)
8. BYOK credential handling (`safeStorage` DPAPI)
9. Screenshot capture implementation (`desktopCapturer` & DPI crop)
10. Multimodal vision integration & model capability enforcement
11. Temporary chat state (volatile RAM-only memory)
12. Windows build & installer packaging (`electron-builder` NSIS)

All 16 unit & security tests pass. The Electron main process, preload script, and React renderer bundle without errors, and the Electron desktop application was tested and verified to launch and run successfully on Windows.

---

## 2. Completed Features

The following features have been inspected, tested, and verified to be fully functional:

| Feature | Implementation | Verification Details |
|---|---|---|
| **RAM-Only Ephemeral State** | `src/stores/chatStore.ts` | Strictly in-memory Zustand store without `persist` middleware, `localStorage`, or disk logs. All turns, attachments, and deltas clear on "New Chat" or app exit. Verified via `tests/chatStore.test.ts`. |
| **OS-Level Credential Vault** | `electron/services/security/credentialService.ts` | Encrypts API keys via Electron `safeStorage` (Windows DPAPI) in `userData/credentials.enc.json`. Disallows plaintext fallback; never returns raw keys to renderer (exposes only masked hints like `••••9876`). Verified via `tests/security.test.ts`. |
| **IPC & SSRF Protection** | `electron/services/security/validators.ts` | Validates custom OpenAI-compatible endpoints: allows `https:` and local endpoints (`http://localhost`, `http://127.0.0.1`), while strictly blocking link-local/cloud metadata IPs (`169.254.169.254`, `metadata.google.internal`) and embedded credentials. |
| **Multi-Monitor DPI Cropping** | `electron/services/screen/cropService.ts` | Accurately converts DIP coordinates to physical coordinates under Windows Display Scaling (125%, 150%, 200%), clamps bounds, downscales oversized captures, and rejects accidental sub-8px clicks. Verified via `tests/cropService.test.ts`. |
| **Window Geometry & Clamping** | `electron/windows/chatWindow.ts`, `electron/main/windowManager.ts` | Computes expanded bounds from orb corner anchor, clamps inside display `workArea`, remembers session positions, and handles display add/remove/metrics-changed events dynamically. |
| **Streaming AI Adapters** | `electron/services/ai/*` | Full SSE streaming support for Gemini (`generateContentStream`), Groq (`chat.completions.create(stream: true)`), and OpenAI-compatible endpoints with `AbortController` cancellation. Verified via `tests/aiProviders.test.ts`. |
| **Vision Enforcement** | `electron/services/ai/AIProvider.ts` | Throws explicit `VisionUnsupportedError` when image attachments are sent to text-only models rather than silently discarding user screenshots. |
| **Electron Sandboxing** | `electron/windows/widgetWindow.ts`, `electron/preload/index.ts` | Context isolation enabled, nodeIntegration disabled, sandbox enabled, web security enabled, window opening denied, navigation restricted to bundle origin. |
| **Frameless Floating Orb UI** | `src/components/FloatingOrb.tsx`, `useWindowDrag.ts` | Custom geometric SVG aperture icon, pointer-capture dragging (>4px movement threshold to avoid swallowing clicks), status ring animation (streaming, error, ready). |
| **Markdown & Code Rendering** | `src/components/MessageBubble.tsx` | Markdown rendering with `remark-gfm` and syntax highlighting with `highlight.js` for both dark and light modes with one-click code copy. |
| **Windows NSIS Build Target** | `electron-builder.yml`, `scripts/build-electron.mjs` | NSIS 64-bit installer definition with customizable installation directory, start menu & desktop shortcuts, and embedded icon generator (`resources/icons/icon.ico`). |

---

## 3. Incomplete & Missing Features

1. **System Tray Integration (`Tray`)**:
   - **Current State:** The application defaults to `hideFromTaskbar: true`. However, there is currently no `Tray` icon in the Windows notification area.
   - **Impact:** If the window is hidden or if the global shortcut (`Ctrl+Space`) is conflicted or claimed by another application, the user has no direct tray menu to unhide the window, open settings, or quit the application.
2. **Branding Updates to "Vibha"**:
   - **Current State:** The imported codebase used the working title "Floating AI" across `package.json`, `electron-builder.yml`, `metadata.json`, `index.html`, and React header/settings views.
   - **Impact:** Needs consistent branding updates to `Vibha` throughout the UI, window titles, system prompts, and package configs.
3. **Self-Exclusion in Window Capture List**:
   - **Current State:** `captureService.ts` line 60 excludes `src.name === 'Floating AI'`.
   - **Impact:** When renamed to "Vibha", the window capture picker must exclude `src.name === 'Vibha'` (as well as `Floating AI`) so Vibha does not capture its own window in the active window list.
4. **Global Shortcut Collision Recovery**:
   - **Current State:** If `globalShortcut.register` fails (e.g. `Ctrl+Space` is registered by Windows PowerToys or another utility), `appLifecycle.ts` logs an error and rolls back, but does not provide an automated fallback (e.g. `Ctrl+Shift+Space`).

---

## 4. Broken & Problematic Features

1. **Windows Script Incompatibility (`package.json`)**:
   - **Problem:** The `dev:electron` script contained:
     `wait-on http://127.0.0.1:3000 && ELECTRON_RENDERER_URL=http://127.0.0.1:3000 electron .`
     In Windows CMD / PowerShell, inline environment variable prefixing (`VAR=val cmd`) is not supported and causes immediate failure:
     `'ELECTRON_RENDERER_URL' is not recognized as an internal or external command`.
   - **Problem:** When launched from IDE terminals, `ELECTRON_RUN_AS_NODE=1` is frequently inherited, causing `electron .` to execute as a plain Node.js script instead of an Electron desktop GUI process.
   - **Solution:** Use `cross-env` with `ELECTRON_RUN_AS_NODE=` cleared:
     `cross-env ELECTRON_RUN_AS_NODE= ELECTRON_RENDERER_URL=http://127.0.0.1:3000 electron .`
2. **Clean Script POSIX-Only Syntax (`package.json`)**:
   - **Problem:** `"clean": "rm -rf dist dist-electron release server.js"` fails on standard Windows command line.
   - **Solution:** Replace with a cross-platform rimraf/node clean command.
3. **Vite Deprecated `__dirname` Warning (`vite.config.ts`)**:
   - **Problem:** `vite.config.ts` uses `path.resolve(__dirname, '.')`, triggering a warning in Vite 8.
   - **Solution:** Use `import.meta.dirname` or file URL resolution.

---

## 5. Security & Vulnerability Analysis

| Category | Finding | Severity | Resolution / Status |
|---|---|---|---|
| **API Key Storage** | Electron `safeStorage` (DPAPI) is enforced; plaintext fallback is explicitly prevented by `CredentialEncryptionUnavailableError`. | None (Secure) | PASS — Verified by `tests/security.test.ts`. |
| **API Key IPC Leakage** | `getCredentialInternal` is strictly main-process only; renderer snapshots only receive `maskedHint` (`••••9876`). | None (Secure) | PASS — Verified. |
| **SSRF in Custom URLs** | `validators.ts` validates custom base URLs, blocking IP literals like `169.254.169.254` and non-HTTP/HTTPS schemes. | None (Secure) | PASS — Verified by `tests/security.test.ts`. |
| **Renderer Hardening** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `setWindowOpenHandler` denies all popup windows, `will-navigate` blocks navigation away from app. | None (Secure) | PASS — Verified. |
| **Unused Dependencies** | `express`, `@types/express`, `motion`, `dotenv` are listed in `package.json` but never imported anywhere in the project, increasing attack surface and package size. | Low | Remove unused packages. |
| **Electron Dependency Placement** | `electron` was listed in `"dependencies"` rather than `"devDependencies"`. | Low | Move `electron` to `devDependencies`. |

---

## 6. Features Requiring Native Desktop vs. Browser Preview

| Feature | Browser Preview (`npm run dev`) | Windows Electron (`npm run dev:electron`) |
|---|---|---|
| **UI Layout & Dark/Light Theme** | Full preview (interactive widget & panel) | Full native rendering |
| **Drag & Position** | Simulated via CSS transforms | Native Windows OS window repositioning (`win.setBounds`) |
| **Always-on-Top / Screen-Saver** | Unavailable (contained inside browser tab) | Native Win32 window layer (`screen-saver` level) |
| **BYOK Credential Encryption** | In-memory simulated status | Real OS DPAPI encryption via `safeStorage` |
| **AI Streaming** | Gated (prompts user to launch Electron) | Direct main-process streaming with zero CORS restrictions |
| **Screen Capture** | Gated (prompts user to launch Electron) | Fullscreen, window, and area capture via `desktopCapturer` |
| **Global Hotkey (`Ctrl+Space`)** | Local key listener inside tab | OS-wide global accelerator via `globalShortcut` |

---

## 7. Recommended Fixes (Prioritized)

### Priority 1: Project Initialization & Windows Runtime (Immediate)
1. Update `package.json`:
   - Add `cross-env` to handle cross-platform environment variables (`ELECTRON_RENDERER_URL` and clearing `ELECTRON_RUN_AS_NODE`).
   - Fix `dev:electron` script.
   - Fix `clean` script for Windows.
   - Move `electron` to `devDependencies`.
   - Remove unused dependencies (`express`, `@types/express`, `motion`, `dotenv`).
2. Update branding to **Vibha**:
   - `package.json`, `electron-builder.yml`, `metadata.json`, `index.html`.
   - React UI (`ChatHeader.tsx`, `FloatingOrb.tsx`, `ChatPanel.tsx`, `SettingsPanel.tsx`, `App.tsx`).
   - AI system prompts (`GeminiProvider.ts`, `GroqProvider.ts`, `OpenAICompatibleProvider.ts`).
   - Self-exclusion in `captureService.ts` (`src.name === 'Vibha' || src.name === 'Floating AI'`).
3. Update `vite.config.ts`:
   - Replace `__dirname` with `import.meta.dirname` to eliminate Vite 8 deprecation warning.

### Priority 2: Windows System Tray Integration (Recommended Next)
1. Add a `Tray` manager in `electron/main/trayManager.ts`.
2. Display Vibha icon in Windows system notification area.
3. Provide context menu:
   - Toggle Vibha (Show / Hide)
   - Settings...
   - Check for Updates
   - Exit Vibha

### Priority 3: Architecture & Feature Enhancements (Post-Review Roadmap)
1. **Shortcut Collision Fallback**: If `Ctrl+Space` is occupied by another application, offer automated alternative (`Ctrl+Alt+Space` or `Alt+Space`).
2. **OCR Pre-processing / Multi-image Context**: Support consecutive screenshot stacking (up to 4) with token-size indicator in chat input.
3. **Local LLM Preset**: One-click preset for local Ollama / LM Studio endpoints (`http://localhost:11434/v1`).
4. **Code Signing Setup**: Guide for Windows Authenticode signing in `electron-builder.yml`.

---

## 8. Verification Results

- **Unit & Security Tests:** `vitest run` — 4/4 test files passed, 16/16 tests passed.
- **TypeScript Static Check:** `tsc --noEmit` — 0 errors.
- **Renderer Build:** `vite build` — Successfully built client production bundle.
- **Electron Main/Preload Build:** `node scripts/build-electron.mjs` — Successfully built `dist-electron/main/index.cjs` (1.99 MB) and `dist-electron/preload/index.cjs` (2.65 KB).
- **Electron Native Launch:** Verified app launches, creates window, registers IPC, and runs stably without crashing.
