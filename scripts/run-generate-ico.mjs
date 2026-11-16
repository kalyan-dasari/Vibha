import { spawnSync } from 'node:child_process';
import electronPath from 'electron';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const res = spawnSync(electronPath, ['scripts/generate-ico.cjs'], {
  env,
  stdio: 'inherit',
});

process.exit(res.status ?? 0);
