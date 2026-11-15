import { spawn } from 'node:child_process';
import electronPath from 'electron';

// Explicitly remove ELECTRON_RUN_AS_NODE from environment block
delete process.env.ELECTRON_RUN_AS_NODE;

process.env.ELECTRON_RENDERER_URL = 'http://127.0.0.1:3000';

console.log('Spawning electron from:', electronPath);
console.log('ELECTRON_RUN_AS_NODE in env:', 'ELECTRON_RUN_AS_NODE' in process.env);

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  console.log('Electron exited with code:', code);
  process.exit(code ?? 0);
});
