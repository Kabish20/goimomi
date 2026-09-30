import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(frontend, '..', 'goimomibackend');
const python = process.env.GOIMOMI_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
let django;
let vite;

const listening = () => new Promise(done => {
  const socket = connect(8000, '127.0.0.1');
  socket.once('connect', () => { socket.destroy(); done(true); });
  socket.once('error', () => done(false));
  socket.setTimeout(1000, () => { socket.destroy(); done(false); });
});
const wait = ms => new Promise(done => setTimeout(done, ms));

function stop(code = 0) {
  vite?.kill();
  django?.kill();
  process.exit(code);
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

if (await listening()) {
  process.stdout.write('Django is already listening on 127.0.0.1:8000.\n');
} else {
  django = spawn(python, ['manage.py', 'runserver', '127.0.0.1:8000'], {
    cwd: backend, stdio: 'inherit', windowsHide: true,
  });
  django.on('error', error => { process.stderr.write(`Could not start Django: ${error.message}\n`); stop(1); });
  for (let attempt = 0; attempt < 60 && !await listening(); attempt += 1) {
    if (django.exitCode !== null) stop(django.exitCode || 1);
    await wait(500);
  }
  if (!await listening()) {
    process.stderr.write('Django did not open port 8000. Check the backend output above.\n');
    stop(1);
  }
}

vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host'], {
  cwd: frontend, stdio: 'inherit', windowsHide: true,
});
vite.on('error', error => { process.stderr.write(`Could not start Vite: ${error.message}\n`); stop(1); });
vite.on('exit', code => stop(code || 0));
