/* Additive, idempotent upgrade. Existing records and uploaded files are preserved. */
export function migrate(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied TEXT NOT NULL)');
    const add=(table,name,definition)=>{if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===name))db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)};
    add('cases','deleted_at','TEXT');add('cases','deleted_by','INTEGER');
    add('files','info_answer','INTEGER REFERENCES info_answers(id)');add('files','uploaded_by','INTEGER REFERENCES users(id)');
    for(const name of ['guest_name','guest_email','guest_phone','public_reference'])add('support_tickets',name,"TEXT NOT NULL DEFAULT ''");
    add('support_tickets','source',"TEXT NOT NULL DEFAULT 'account'");
    db.exec(`CREATE INDEX IF NOT EXISTS idx_cases_company_deleted ON cases(company,deleted_at);
      CREATE INDEX IF NOT EXISTS idx_files_case_answer ON files(case_id,info_answer);
      CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status,updated);
      CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit(action,created);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_reference ON support_tickets(public_reference) WHERE public_reference!='';`);
    db.prepare('INSERT OR IGNORE INTO schema_migrations(version,applied) VALUES(6,?)').run(new Date().toISOString());
    db.exec(`CREATE TABLE IF NOT EXISTS registration_history(id INTEGER PRIMARY KEY,company INTEGER NOT NULL REFERENCES companies(id),actor INTEGER REFERENCES users(id),action TEXT NOT NULL,from_status TEXT,to_status TEXT,message TEXT NOT NULL,created TEXT NOT NULL,legacy_audit INTEGER UNIQUE);
      CREATE INDEX IF NOT EXISTS idx_registration_history_company ON registration_history(company,id);
      CREATE TABLE IF NOT EXISTS case_closure_requests(id INTEGER PRIMARY KEY,case_id INTEGER NOT NULL REFERENCES cases(id),requested_by INTEGER NOT NULL REFERENCES users(id),reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created TEXT NOT NULL,decided_by INTEGER REFERENCES users(id),decided TEXT,reply TEXT NOT NULL DEFAULT '');
      CREATE UNIQUE INDEX IF NOT EXISTS idx_closure_pending_case ON case_closure_requests(case_id) WHERE status='pending';
      CREATE TABLE IF NOT EXISTS file_deletions(stored TEXT PRIMARY KEY,created TEXT NOT NULL);`);
    if(!db.prepare('SELECT version FROM schema_migrations WHERE version=7').get()){
      const statusFor={registration_complete:'pending',registration_submitted:'pending',registration_approved:'approved',registration_needs_info:'needs_info',registration_rejected:'rejected'};
      const labels={registration_complete:'تم تسجيل ملف المنشأة',registration_submitted:'تم ارسال الملف للمراجعة',registration_approved:'تم اعتماد المنشأة',registration_needs_info:'طلب المركز استكمال بيانات',registration_rejected:'لم يعتمد المركز الملف'};
      const stamp=new Date().toISOString();
      for(const company of db.prepare('SELECT id,status,reason FROM companies').all()){
        let previous='draft',last;
        const events=db.prepare("SELECT audit.*,users.id actor_id FROM audit LEFT JOIN users ON users.id=audit.actor WHERE target=? AND action IN ('registration_complete','registration_submitted','registration_approved','registration_needs_info','registration_rejected') ORDER BY id").all(String(company.id));
        for(const e of events){const to=statusFor[e.action];const result=db.prepare('INSERT INTO registration_history(company,actor,action,from_status,to_status,message,created,legacy_audit) VALUES(?,?,?,?,?,?,?,?)').run(company.id,e.actor_id||null,e.action,previous,to,labels[e.action],e.created,e.id);previous=to;last=Number(result.lastInsertRowid)}
        if(last&&previous===company.status&&company.reason)db.prepare('UPDATE registration_history SET message=? WHERE id=?').run(company.reason,last);
        else if(!last||previous!==company.status)db.prepare('INSERT INTO registration_history(company,action,from_status,to_status,message,created) VALUES(?,?,?,?,?,?)').run(company.id,'status_snapshot',previous,company.status,company.reason||'الحالة المحفوظة للمنشأة قبل بدء سجل المراجعة',stamp);
      }
      // Earlier versions allowed sent requests into trash. Preserve their complete history.
      for(const c of db.prepare("SELECT id,company FROM cases WHERE deleted_at IS NOT NULL AND status!='draft'").all()){
        db.prepare('UPDATE cases SET deleted_at=NULL,deleted_by=NULL,version=version+1 WHERE id=?').run(c.id);
        db.prepare('INSERT INTO events(case_id,company,actor,kind,message,created) VALUES(?,?,NULL,?,?,?)').run(c.id,c.company,'history_preserved','الطلب المرسل محفوظ ضمن سجل الطلبات.',stamp);
      }
      db.prepare('INSERT INTO schema_migrations(version,applied) VALUES(7,?)').run(stamp);
    }
    db.exec('COMMIT');
  } catch(error) {db.exec('ROLLBACK');throw error}
}
