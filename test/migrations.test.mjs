import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {migrate} from '../migrations.mjs';
test('V5 database upgrades twice without losing records, approvals, files or passwords',()=>{
  const source=fs.readFileSync(new URL('../db.mjs',import.meta.url),'utf8'),schema=source.match(/db\.exec\(`([\s\S]+?)`\);/)[1];
  const db=new DatabaseSync(':memory:');db.exec(schema);
  db.exec("INSERT INTO companies(id,name,status) VALUES(1,'Existing organization','approved');INSERT INTO users(id,email,name,role,hash,company) VALUES(1,'existing@example.test','Existing Person','factory','existing-scrypt-hash',1);INSERT INTO factories(id,company,name,status) VALUES(1,1,'Existing plant','approved');INSERT INTO cases(id,company,user,title,status,form) VALUES(1,1,1,'Existing request','needs_info','{}');INSERT INTO files(id,company,case_id,kind,name,stored) VALUES(1,1,1,'attachment','existing.pdf','original-opaque-name');INSERT INTO support_tickets(id,user,subject,status) VALUES(1,1,'Existing support','open');");
  migrate(db);migrate(db);
  assert.equal(db.prepare('SELECT hash FROM users WHERE id=1').get().hash,'existing-scrypt-hash');assert.equal(db.prepare('SELECT status FROM companies WHERE id=1').get().status,'approved');assert.equal(db.prepare('SELECT status FROM factories WHERE id=1').get().status,'approved');assert.equal(db.prepare('SELECT stored FROM files WHERE id=1').get().stored,'original-opaque-name');assert.equal(db.prepare('SELECT deleted_at FROM cases WHERE id=1').get().deleted_at,null);assert.equal(db.prepare('SELECT source FROM support_tickets WHERE id=1').get().source,'account');assert.equal(db.prepare('SELECT COUNT(*) n FROM schema_migrations').get().n,2);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.close();
});
test('V6 upgrade separates actual registration states and restores sent history without restoring private drafts',()=>{
 const source=fs.readFileSync(new URL('../db.mjs',import.meta.url),'utf8'),schema=source.match(/db\.exec\(`([\s\S]+?)`\);/)[1];
 const db=new DatabaseSync(':memory:');db.exec(schema);migrate(db);
 db.exec("DELETE FROM schema_migrations WHERE version=7;INSERT INTO companies(id,name,status,reason) VALUES(1,'Needs information','needs_info','Replace the unreadable register');INSERT INTO users(id,email,name,role,hash,company) VALUES(1,'old@test.test','Factory','factory','unchanged',1),(2,'admin@test.test','Admin','admin','unchanged',NULL);INSERT INTO audit(actor,action,target,created) VALUES(1,'registration_complete','1','2026-11-01T10:00:00Z'),(2,'registration_needs_info','1','2026-11-02T10:00:00Z');INSERT INTO cases(id,company,user,title,status,form,deleted_at,deleted_by) VALUES(1,1,1,'Solved history','solved','{}','2026-11-03',1),(2,1,1,'Sent history','submitted','{}','2026-11-03',1),(3,1,1,'Private draft','draft','{}','2026-11-03',1);INSERT INTO files(company,case_id,stored) VALUES(1,1,'kept-file.pdf');");
 migrate(db);migrate(db);
 const history=db.prepare('SELECT * FROM registration_history WHERE company=1 ORDER BY id').all();assert.equal(history.length,2);assert.equal(history[1].to_status,'needs_info');assert.equal(history[1].message,'Replace the unreadable register');assert.equal(history[1].actor,2);assert.equal(history[1].created,'2026-11-02T10:00:00Z');
 for(const id of [1,2]){const c=db.prepare('SELECT * FROM cases WHERE id=?').get(id);assert.equal(c.deleted_at,null);assert.equal(c.version,2)}
 assert.equal(db.prepare('SELECT status FROM cases WHERE id=1').get().status,'solved');assert.ok(db.prepare('SELECT deleted_at FROM cases WHERE id=3').get().deleted_at);assert.equal(db.prepare('SELECT COUNT(*) n FROM events').get().n,2);assert.equal(db.prepare('SELECT stored FROM files').get().stored,'kept-file.pdf');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.close();
});
