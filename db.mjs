import {migrate} from './migrations.mjs';
import {
  DatabaseSync
} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash
} from 'node:crypto';
export const DATA = path.resolve(process.env.DATA_DIR || 'data');
fs.mkdirSync(DATA, {
  recursive: true,
  mode: 0o700
});
fs.mkdirSync(DATA + '/uploads', {
  recursive: true,
  mode: 0o700
});
export const db = new DatabaseSync(DATA + '/imc.sqlite');
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,phone TEXT,role TEXT NOT NULL,hash TEXT NOT NULL,verified INTEGER DEFAULT 0,company INTEGER);
CREATE TABLE IF NOT EXISTS companies(id INTEGER PRIMARY KEY,name TEXT,commercial TEXT,tax TEXT,kind TEXT,representative TEXT,status TEXT DEFAULT 'draft',data TEXT DEFAULT '{}',reason TEXT DEFAULT '',updated TEXT);
CREATE TABLE IF NOT EXISTS factories(id INTEGER PRIMARY KEY,company INTEGER REFERENCES companies(id),name TEXT,gov TEXT,city TEXT,region TEXT,sector TEXT,size TEXT,industrial TEXT,status TEXT DEFAULT 'pending',data TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user INTEGER REFERENCES users(id),csrf TEXT,expires INTEGER);
CREATE TABLE IF NOT EXISTS tokens(token TEXT PRIMARY KEY,user INTEGER REFERENCES users(id),purpose TEXT,expires INTEGER);
CREATE TABLE IF NOT EXISTS cases(id INTEGER PRIMARY KEY,company INTEGER REFERENCES companies(id),user INTEGER REFERENCES users(id),title TEXT,status TEXT DEFAULT 'draft',form TEXT,assessment TEXT DEFAULT '{}',created TEXT,updated TEXT,version INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,case_id INTEGER REFERENCES cases(id),company INTEGER,actor INTEGER,kind TEXT,message TEXT,internal INTEGER DEFAULT 0,created TEXT);
CREATE TABLE IF NOT EXISTS files(id INTEGER PRIMARY KEY,company INTEGER,case_id INTEGER,factory INTEGER,kind TEXT,name TEXT,stored TEXT,type TEXT,size INTEGER,created TEXT);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor INTEGER,action TEXT,target TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY,user INTEGER,title TEXT,seen INTEGER DEFAULT 0,created TEXT);
CREATE TABLE IF NOT EXISTS mail(id INTEGER PRIMARY KEY,user INTEGER,email TEXT,subject TEXT,body TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS partners(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,name TEXT NOT NULL,code TEXT DEFAULT '',contact TEXT DEFAULT '',active INTEGER DEFAULT 1,created TEXT);
CREATE TABLE IF NOT EXISTS support_tickets(id INTEGER PRIMARY KEY,user INTEGER REFERENCES users(id),subject TEXT,category TEXT,status TEXT DEFAULT 'open',created TEXT,updated TEXT);
CREATE TABLE IF NOT EXISTS support_messages(id INTEGER PRIMARY KEY,ticket INTEGER REFERENCES support_tickets(id),actor INTEGER REFERENCES users(id),message TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS info_requests(id INTEGER PRIMARY KEY,case_id INTEGER REFERENCES cases(id),actor INTEGER,question TEXT,fields TEXT DEFAULT '',documents TEXT DEFAULT '',due TEXT DEFAULT '',status TEXT DEFAULT 'open',created TEXT,answered TEXT);
CREATE TABLE IF NOT EXISTS info_answers(id INTEGER PRIMARY KEY,request INTEGER REFERENCES info_requests(id),actor INTEGER,message TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS project_updates(id INTEGER PRIMARY KEY,case_id INTEGER REFERENCES cases(id),actor INTEGER,phase TEXT,progress INTEGER,note TEXT,source TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER,until INTEGER);
`);
migrate(db);
export const now = () => new Date().toISOString();
export const all = (q, ...p) => db.prepare(q).all(...p);
export const one = (q, ...p) => db.prepare(q).get(...p);
export const run = (q, ...p) => db.prepare(q).run(...p);
export const token = () => randomBytes(32).toString('hex');
export const digest = x => createHash('sha256').update(x).digest('hex');
export function hash(p, s = randomBytes(16).toString('hex')) {
  return s + ':' + scryptSync(p, s, 64, {
    N: 32768,
    r: 8,
    p: 3,
    maxmem: 64 * 1024 * 1024
  }).toString('hex')
}
export function check(p, h) {
  try {
    let [s, v] = h.split(':');
    return timingSafeEqual(Buffer.from(hash(p, s).split(':')[1], 'hex'), Buffer.from(v, 'hex'))
  } catch {
    return false
  }
}
export function audit(actor, action, target) {
  run('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)', actor, action, String(target), now())
}
export function notify(company, title) {
  for (const u of all('SELECT id FROM users WHERE company=?', company)) run(
    'INSERT INTO notices(user,title,created) VALUES(?,?,?)', u.id, title, now())
}
export function event(c, u, kind, message, internal = 0) {
  run('INSERT INTO events(case_id,company,actor,kind,message,internal,created) VALUES(?,?,?,?,?,?,?)', c.id, c
    .company, u.id, kind, message, internal, now());
  audit(u.id, kind, c.id);
  if (!internal && kind!=='draft') {notify(c.company,message);if(u.role!=='admin')notifyAdmins('رد جديد على الطلب IMC-'+c.id,c.id);}
}

export function notifyAdmins(title,ref){for(const u of all("SELECT id FROM users WHERE role='admin'"))run('INSERT INTO notices(user,title,created) VALUES(?,?,?)',u.id,title+(ref?' #'+ref:''),now());}
