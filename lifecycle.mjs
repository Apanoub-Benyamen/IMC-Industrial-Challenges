import fs from 'node:fs';
import path from 'node:path';
import {db,run,one,all,now,event,audit,DATA} from './db.mjs';
const requireValue=(value,message,status=400)=>{if(!value)throw Object.assign(Error(message),{status})};
export function registrationEvent(company,actor,action,from,to,message){run('INSERT INTO registration_history(company,actor,action,from_status,to_status,message,created) VALUES(?,?,?,?,?,?,?)',company,actor,action,from,to,message,now())}
export function closureRecords(caseId){return all('SELECT r.*,u.name requester_name,a.name reviewer_name FROM case_closure_requests r JOIN users u ON u.id=r.requested_by LEFT JOIN users a ON a.id=r.decided_by WHERE r.case_id=? ORDER BY r.id DESC',caseId)}
export function drainFileDeletions(){for(const row of all('SELECT stored FROM file_deletions')){try{requireValue(path.basename(row.stored)===row.stored&&!['.','..',''].includes(row.stored),'اسم ملف تخزين غير صالح');fs.rmSync(path.join(DATA,'uploads',row.stored),{force:true});run('DELETE FROM file_deletions WHERE stored=?',row.stored)}catch{console.warn('A purged draft file is queued for cleanup.')}}}
export function purgeDraft(c,u,b){
  requireValue(c.status==='draft'&&c.deleted_at,'الحذف النهائي متاح للمسودات الموجودة في السلة فقط');
  requireValue(!one("SELECT id FROM events WHERE case_id=? AND kind='submitted'",c.id),'لا يمكن حذف طلب سبق ارساله للمركز');
  requireValue(b.confirm===true,'اكد الحذف النهائي');requireValue(b.version===c.version,'تغيرت المسودة. حدث السلة وحاول مرة اخرى',409);
  const files=all('SELECT stored FROM files WHERE case_id=?',c.id);
  db.exec('BEGIN');try{
    run('DELETE FROM files WHERE case_id=?',c.id);
    for(const file of files)if(file.stored&&!one('SELECT id FROM files WHERE stored=?',file.stored))run('INSERT OR IGNORE INTO file_deletions(stored,created) VALUES(?,?)',file.stored,now());
    run('DELETE FROM info_answers WHERE request IN (SELECT id FROM info_requests WHERE case_id=?)',c.id);
    run('DELETE FROM info_requests WHERE case_id=?',c.id);run('DELETE FROM project_updates WHERE case_id=?',c.id);
    run('DELETE FROM case_closure_requests WHERE case_id=?',c.id);run('DELETE FROM events WHERE case_id=?',c.id);
    run('DELETE FROM cases WHERE id=?',c.id);audit(u.id,'draft_purged',c.id);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  drainFileDeletions();return {ok:true,cleanupPending:files.some(f=>one('SELECT stored FROM file_deletions WHERE stored=?',f.stored))};
}
export function requestClosure(c,u,b){
  requireValue(!['draft','solved','closed'].includes(c.status),'طلب الاغلاق متاح للطلبات المرسلة غير المنتهية فقط');
  requireValue(b.version===c.version,'تغير الطلب. حدث الصفحة وحاول مرة اخرى',409);
  requireValue(typeof b.message==='string'&&b.message.trim().length>=10&&b.message.trim().length<=2000,'اكتب سبب طلب الاغلاق من 10 احرف على الاقل');
  requireValue(!one("SELECT id FROM case_closure_requests WHERE case_id=? AND status='pending'",c.id),'يوجد طلب اغلاق بانتظار قرار المركز',409);
  db.exec('BEGIN');try{const id=Number(run('INSERT INTO case_closure_requests(case_id,requested_by,reason,created) VALUES(?,?,?,?)',c.id,u.id,b.message.trim(),now()).lastInsertRowid);run('UPDATE cases SET version=version+1,updated=? WHERE id=?',now(),c.id);event(c,u,'closure_requested','طلبت المنشأة اغلاق الطلب: '+b.message.trim());db.exec('COMMIT');return {ok:true,id}}catch(e){db.exec('ROLLBACK');throw e}
}
export function decideClosure(c,u,b){
  const request=one("SELECT * FROM case_closure_requests WHERE id=? AND case_id=? AND status='pending'",b.request||0,c.id);
  requireValue(request,'طلب الاغلاق غير مفتوح');requireValue(!['draft','solved','closed'].includes(c.status),'الطلب منتهي ولا يقبل قرار اغلاق جديد');
  requireValue(b.version===c.version,'تغير الطلب. حدث الصفحة وحاول مرة اخرى',409);
  requireValue(['approved','rejected'].includes(b.decision),'اختر قرار طلب الاغلاق');
  requireValue(typeof b.message==='string'&&b.message.trim().length>=3&&b.message.trim().length<=2000,'اكتب رسالة توضح قرار المركز');
  const approved=b.decision==='approved',assessment=JSON.parse(c.assessment||'{}');if(approved)assessment.outcome='withdrawn';
  db.exec('BEGIN');try{run('UPDATE case_closure_requests SET status=?,decided_by=?,decided=?,reply=? WHERE id=?',b.decision,u.id,now(),b.message.trim(),request.id);run('UPDATE cases SET status=?,assessment=?,updated=?,version=version+1 WHERE id=?',approved?'closed':c.status,JSON.stringify(assessment),now(),c.id);if(approved)run("UPDATE info_requests SET status='superseded' WHERE case_id=? AND status='open'",c.id);event(c,u,approved?'closed':'closure_rejected',(approved?'اغلق المركز الطلب بناء على طلب المنشأة. ':'لم يوافق المركز على طلب الاغلاق. ')+b.message.trim());db.exec('COMMIT');return {ok:true}}catch(e){db.exec('ROLLBACK');throw e}
}
export function finalizeClosureOnReview(c,u,status,message){if(!['closed','solved'].includes(status))return;run("UPDATE case_closure_requests SET status=?,decided_by=?,decided=?,reply=? WHERE case_id=? AND status='pending'",status==='closed'?'approved':'rejected',u.id,now(),status==='solved'?'تم توثيق حل الطلب. '+message:message,c.id)}
drainFileDeletions();const cleanup=setInterval(drainFileDeletions,30000);cleanup.unref();
