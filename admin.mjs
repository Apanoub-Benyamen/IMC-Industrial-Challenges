// Bootstrap a real admin with an interactive, masked password prompt. No default production password.
import {
  createInterface
} from 'node:readline/promises';
import {
  Writable
} from 'node:stream';
import {
  run,
  one,
  hash
} from './db.mjs';
let muted = false;
const output = new Writable({
  write(chunk, encoding, cb) {
    if (!muted) process.stdout.write(chunk);
    cb()
  }
});
const rl = createInterface({
  input: process.stdin,
  output,
  terminal: true
});
try {
  const email = (await rl.question('Admin email: ')).trim().toLowerCase();
  const name = (await rl.question('Display name: ')).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) throw Error('Valid email and name required');
  if (one('SELECT id FROM users WHERE email=?', email)) throw Error('Email already exists');
  process.stdout.write('Password (12+ characters, hidden): ');
  muted = true;
  const p = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  if (p.length < 12 || p.length > 128) throw Error('Password must contain 12–128 characters');
  run('INSERT INTO users(email,name,role,hash,verified) VALUES(?,?,?,?,1)', email, name, 'admin', hash(p));
  console.log(
    'Admin created. Protect this account and enable an organizational identity gateway before launch.')
} finally {
  rl.close()
}
