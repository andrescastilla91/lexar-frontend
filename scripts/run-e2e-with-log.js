const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'e2e-output.log');
const logStream = fs.createWriteStream(logPath, { flags: 'w' });

const args = ['playwright', 'test', ...process.argv.slice(2)];

const child = spawn('npx', args, {
  cwd: path.join(__dirname, '..'),
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, E2E_BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:4300' },
});

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  logStream.write(chunk);
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
  logStream.write(chunk);
});

child.on('close', (code) => {
  logStream.end(() => process.exit(code === null ? 1 : code));
});
