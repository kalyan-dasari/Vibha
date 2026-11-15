import { spawn } from 'node:child_process';
import electronPath from 'electron';

// Completely delete ELECTRON_RUN_AS_NODE so Electron runs as a desktop GUI app
// rather than being forced into Node.js CLI mode by IDE terminal environments.
delete process.env.ELECTRON_RUN_AS_NODE;

process.env.ELECTRON_RENDERER_URL = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:3000';

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
