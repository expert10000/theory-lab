import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const python = process.env.QLAB_PYTHON || resolve('.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const result = spawnSync(python, process.argv.slice(2), { stdio: 'inherit', env: { ...process.env, PYTHONPATH: resolve('workers/quantum-python') } });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
