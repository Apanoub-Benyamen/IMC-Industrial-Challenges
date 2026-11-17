import {registrationEvent,closureRecords,purgeDraft,requestClosure,decideClosure,finalizeClosureOnReview} from './lifecycle.mjs';
import './public/records.js';
import './public/locations.js';
const R=globalThis.IMCRecords;
import './public/validation.js';
const V=globalThis.IMCValidation;
import {
  xlsx
} from './xlsx.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';
import {
  db,
  DATA,
  all,
  one,
  run,
  now,
  token,
  digest,
  hash,
  check,
  audit,
  event,
  notify,notifyAdmins
} from './db.mjs';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEMO = process.env.DEMO_MODE !== 'false';
const PORT = Number(process.env.PORT || (process.argv.includes('--port') ? process.argv[process.argv.indexOf(
  '--port') + 1] : 3000));
const BASE = process.env.APP_ORIGIN || `http://localhost:${PORT}`;
if (!DEMO && (!process.env.APP_ORIGIN?.startsWith('https://') || !process.env.MAIL_WEBHOOK || !process.env
    .SCAN_WEBHOOK)) throw Error('Production requires HTTPS APP_ORIGIN, MAIL_WEBHOOK and SCAN_WEBHOOK');
if (!DEMO && one("SELECT id FROM users WHERE email LIKE '%@imc-demo.test' LIMIT 1")) throw Error(
  'Use a fresh production database without demonstration accounts');
const fail = (m, s = 400) => {
  let e = Error(m);
  e.status = s;
  throw e
};
const str = (x, n = 300) => typeof x === 'string' ? x.trim().slice(0, n) : '';
const required = (x, msg, status = 400) => {
  if (!x) fail(msg, status)
};
const id = x => {
  let n = Number(x);
  if (!Number.isSafeInteger(n) || n < 1) fail('مرجع غير صالح');
  return n
};

function rate(k, limit = 10) {
  let a = one('SELECT * FROM attempts WHERE key=?', k);
  if (a && a.until > Date.now() && a.count >= limit) fail('محاولات كثيرة. حاول بعد 15 دقيقة.', 429);
  if (!a || a.until < Date.now()) run('INSERT OR REPLACE INTO attempts VALUES(?,?,?)', k, 1, Date.now() +
    900000);
  else run('UPDATE attempts SET count=count+1 WHERE key=?', k)
}
async function body(req, max = 150000) {
  let a = [],
    size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > max) fail('حجم الطلب أكبر من المسموح', 413);
    a.push(c)
  }
  return Buffer.concat(a)
}

function cleanUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    verified: !!u.verified,
    company: u.company
  }
}

function getCase(n, u, includeDeleted = false) {
  let c = one('SELECT * FROM cases WHERE id=?', id(n));
  if (!c || (c.deleted_at && !includeDeleted) || (u.role !== 'admin' && c.company !== u.company) || (u.role === 'admin' && c.status === 'draft'))
    fail('الطلب غير موجود', 404);
  return c
}
const transitions = {
  submitted: ['under_review', 'needs_info', 'closed'],
  under_review: ['needs_info', 'assessment', 'assessed', 'closed'],
  needs_info: ['under_review', 'closed'],
  assessment: ['needs_info', 'assessed', 'closed'],
  assessed: ['under_review', 'assigned', 'closed'],
  assigned: ['in_progress', 'assessed', 'closed'],
  in_progress: ['solved', 'assigned', 'closed'],
  solved: ['under_review'],
  closed: ['under_review']
};
const partnerKinds = ['program', 'sector', 'university', 'research', 'lab', 'funder'];

function registrationDuplicate(c,except=0){return one("SELECT id FROM companies WHERE id!=? AND (tax=? OR (commercial=? AND (COALESCE(json_extract(data,'$.commercialType'),'local')='unified' OR COALESCE(json_extract(data,'$.commercialOffice'),'')=?)))",except,V.digits(c.tax).replace(/[-\s]/g,''),V.digits(c.commercial).replace(/\s/g,''),str(c.commercialOffice));}
function companyData(b) {
  required(['local','unified'].includes(b.commercialType||'local') && str(b.name).length >= 3 && V.commercial(b.commercial,b.commercialType||'local',b.commercialOffice) && /^\d{9}$/.test(V.digits(b.tax).replace(/[-\s]/g, '')),
    'راجع نوع ورقم السجل التجاري ومكتب القيد والرقم الضريبي');
  required(['single', 'multi'].includes(b.kind) && ['owner', 'legal', 'delegate'].includes(b.representative),
    'حدد نوع المنشأة وصفة مقدم الطلب');
  required(str(b.address) && V.job(b.job) && ['yes', 'no'].includes(b.imcClient),
    'أكمل المقر والمسمى الوظيفي وحالة عميل المركز');
  if (b.imcClient === 'yes') required(str(b.imcCode), 'كود عميل IMC مطلوب');
  return {
    commercialType:b.commercialType||'local',commercialOffice:str(b.commercialOffice),
    address: str(b.address),
    job: str(b.job),
    imcClient: b.imcClient === 'yes',
    imcCode: b.imcClient === 'yes' ? str(b.imcCode, 80) : '',
    consent: b.consent === true
  };
}

function regionForGovernorate(gov){return ['القاهرة','الجيزة','القليوبية','الشرقية','السويس','الإسماعيلية','بورسعيد','شمال سيناء','جنوب سيناء'].includes(gov)?'القاهرة الكبرى والقناة':['بني سويف','الفيوم','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد'].includes(gov)?'الجنوب':'الشمال'}
function plantData(b) {
  required(globalThis.IMCLocations[str(b.gov)],'اختر محافظة من القائمة');
  required(b.sector!=='أخرى'&&b.subsector!=='أخرى','اكتب القطاع والنشاط الفرعي عند اختيار اخرى');
  if(b.sectorChoice==='other'){required(str(b.sector).length>=2&&b.sector!=='أخرى'&&str(b.subsector).length>=2&&b.subsector!=='أخرى','اكتب القطاع الصناعي والنشاط الفرعي عند اختيار اخرى')}
  for (const k of ['name', 'gov', 'city', 'sector', 'size', 'industrial', 'address', 'subsector', 'year'])
    required(str(b[k]), 'أكمل بيانات المصنع والموقع والنشاط والسنة المالية');
  required(V.industrial(b.industrial),'اكتب رقم السجل الصناعي كما يظهر بالمستند، باستخدام ارقام وفواصل فقط');
  required(['small', 'medium', 'large', 'micro', 'unknown'].includes(b.size), 'نطاق مبيعات غير صالح');
  required(/^\d{4}$/.test(str(b.year)) && Number(b.year) >= 1900 && Number(b.year) <= new Date()
  .getFullYear(), 'سنة مالية غير صالحة');
  if(b.districtChoice&&b.districtChoice!=='other')required(globalThis.IMCLocations[b.gov]?.districts.includes(str(b.city)),'اختر مركزا او قسما تابعا للمحافظة');
  if(b.locationType){required(['industrial','outside'].includes(b.locationType),'حدد موقع المصنع');if(b.locationType==='industrial'){required(str(b.industrialZone),'حدد المنطقة الصناعية');if(b.zoneChoice!=='other')required(globalThis.IMCLocations[b.gov]?.zones.includes(str(b.industrialZone)),'اختر منطقة صناعية تابعة للمحافظة')}}
  return {
    sectorChoice:b.sectorChoice==='other'?'other':'catalog',locationType:str(b.locationType),industrialZone:b.locationType==='industrial'?str(b.industrialZone):'',
    address: str(b.address),
    year: str(b.year),
    subsector: str(b.subsector)
  };
}
async function multipart(req){try{return await new Request('http://localhost',{method:'POST',headers:{'content-type':req.headers['content-type']||''},body:await body(req,26*1024*1024)}).formData()}catch(e){if(e.status)throw e;fail('تعذر قراءة المرفقات')}}
async function checkedFile(file) {
  required(file && file.size > 0 && file.size <= 5 * 1024 * 1024, 'ارفع ملف PDF أو PNG أو JPG حتى 5 MB');
  const buf = Buffer.from(await file.arrayBuffer()),
    ext = path.extname(file.name).toLowerCase();
  let type = '';
  if (buf.subarray(0, 5).toString() === '%PDF-' && ext === '.pdf') type = 'application/pdf';
  if (buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && ext === '.png') type = 'image/png';
  if (buf[0] === 255 && buf[1] === 216 && ['.jpg', '.jpeg'].includes(ext)) type = 'image/jpeg';
  required(type, 'محتوى الملف أو امتداده غير صالح');
  if (!DEMO) {
    const response = await fetch(process.env.SCAN_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${process.env.SCAN_WEBHOOK_KEY||''}`
      },
      body: buf,
      signal: AbortSignal.timeout(15000)
    });
    required(response.ok && (await response.json()).clean === true, 'تعذر اعتماد فحص الملف')
  }
  return {
    buf,
    type,
    name: str(file.name, 120)
  };
}

function password(p) {
  required(typeof p === 'string' && p.length >= 8 && p.length <= 128, 'كلمة المرور من 8 الى 128 حرفا')
}
async function mail(u, purpose) {
  const raw = token();
  run('DELETE FROM tokens WHERE user=? AND purpose=?', u.id, purpose);
  run('INSERT INTO tokens VALUES(?,?,?,?)', digest(raw), u.id, purpose, Date.now() + 3600000);
  let url = BASE + `/#${purpose}/${raw}`;
  let subject = purpose === 'verify' ? 'تأكيد البريد الإلكتروني' : 'إعادة تعيين كلمة المرور';
  if (DEMO) run('INSERT INTO mail(user,email,subject,body,created) VALUES(?,?,?,?,?)', u.id, u.email,
    subject, url, now());
  else {
    const r = await fetch(process.env.MAIL_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAIL_WEBHOOK_KEY||''}`
      },
      body: JSON.stringify({
        to: u.email,
        subject,
        url
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) fail('تعذر إرسال البريد. يرجى إعادة المحاولة.', 503)
  }
}

function validateForm(f, u) {
  required(f && ['challenge', 'improve', 'idea', 'localize', 'lab'].includes(f.kind), 'اختر نوع الطلب');
  const ids = [f.factory, ...(f.scope === 'multi' ? f.additionalFactoryIds || [] : [])].map(id);
  required(new Set(ids).size === ids.length, 'مصنع مكرر');
  for (const n of ids) {
    const p = one('SELECT * FROM factories WHERE id=? AND company=? AND status=?', n, u.company, 'approved');
    required(p, 'يجب اعتماد جميع المصانع المرتبطة بالطلب')
  }
  required(f.consent === true, 'الموافقة على معالجة البيانات مطلوبة');
  if (['challenge', 'improve'].includes(f.kind)) {
    for (const k of ['area', 'symptom', 'probe', 'scope', 'goal']) required(str(f[k]),
      'أكمل بيانات الملاحظة والأثر');
    required(Array.isArray(f.impacts) && f.impacts.length > 0, 'حدد تأثيرًا واحدًا على الأقل');
    if (f.kind === 'challenge') required(str(f.frequency), 'حدد تكرار الملاحظة');
    if (f.area === 'unclear') required(str(f.unclearDetail).length >= 12, 'وضح الملاحظة غير المحددة');
    if (f.scope === 'multi') required(ids.length > 1, 'حدد مصنعًا إضافيًا')
  } else if (f.kind === 'lab') {
    required(['exact', 'area', 'goal'].includes(f.labKnowledge), 'حدد معرفة الاختبار');
    if (f.labKnowledge !== 'goal') required(str(f.labArea), 'حدد مجال الاختبار');
    if (f.labKnowledge === 'exact') {
      required(str(f.labTest), 'حدد الاختبار');
      if (f.labTest === 'custom') required(str(f.labCustomTest).length >= 4, 'اكتب اسم الاختبار')
    } else required(str(f.labGoal), 'حدد الخاصية');
    required(['material', 'product', 'other'].includes(f.labItemKind), 'حدد نوع العينة');
    if (f.labItemKind === 'material') {
      required(str(f.labMaterialFamily) && str(f.labMaterialType), 'حدد المادة');
      if (f.labMaterialFamily === 'other' || f.labMaterialType.includes('أخرى')) required(str(f.labOtherName)
        .length >= 3, 'اكتب اسم المادة')
    }
    if (f.labItemKind === 'product') {
      required(str(f.labProductFamily) && str(f.labProductType), 'حدد المنتج');
      if (f.labProductFamily === 'other' || f.labProductType.includes('آخر')) required(str(f.labOtherName)
        .length >= 3, 'اكتب اسم المنتج')
    }
    if (f.labItemKind === 'other') required(str(f.labOtherName).length >= 4, 'حدد العينة');
    required(str(f.labUse), 'حدد استخدام النتيجة');
    if (f.labSampleCount) required(Number.isInteger(Number(f.labSampleCount)) && Number(f.labSampleCount) > 0,
      'عدد عينات غير صالح')
  } else {
    required(str(f.opType) && str(f.opName).length >= 4 && str(f.opDetails, 3000).length >= 10,
      'أكمل تفاصيل الفكرة');
    required(Array.isArray(f.impacts) && f.impacts.length && str(f.goal), 'حدد الفائدة والنتيجة')
  }
  if (f.metricType) {
    required(f.metricValue !== '' && Number.isFinite(Number(f.metricValue)) && Number(f.metricValue) >= 0,
      'قياس غير صالح');
    required(str(f.metricUnit), 'حدد الوحدة');
    if (f.metricUnit === '%') required(Number(f.metricValue) <= 100 || f.kind !== 'challenge',
      'النسبة الحالية لا تتجاوز 100%')
  }
}

function publicWorkflow(c) {
  const a = JSON.parse(c.assessment);
  return {
    partner: one('SELECT name FROM partners WHERE id=?', a.partner || 0)?.name || '',
    program: one('SELECT name FROM partners WHERE id=?', a.program || 0)?.name || '',
    outcome: ['solved','closed'].includes(c.status)?a.outcome||'':'',
    due: a.due || '',
    note: a.executionNote || '',
    evidence: c.status === 'solved' ? a.evidence || '' : ''
  };
}
export const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
  );
  res.setHeader('Cache-Control', 'no-store');
  if (!DEMO) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  const send = (v, status = 200) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(v))
  };
  try {
    let url = new URL(req.url, BASE),
      p = url.pathname;
    let rawCookie = (req.headers.cookie || '').split(';').find(x => x.trim().startsWith('imc='))?.trim()
      .slice(4);
    let sess = rawCookie ? one('SELECT * FROM sessions WHERE token=? AND expires>?', digest(rawCookie),
      Date.now()) : null;
    let u = sess ? one('SELECT * FROM users WHERE id=?', sess.user) : null;
    if (p.startsWith('/api/') && req.method !== 'GET') {
      if (req.headers.origin && req.headers.origin !== (process.env.APP_ORIGIN ||
          `http://${req.headers.host}`)) fail('مصدر الطلب غير مسموح', 403);
      if (u && req.headers['x-csrf-token'] !== sess.csrf) fail('جلسة غير صالحة. حدّث الصفحة.', 403)
    }
    if (p === '/api/session' && req.method === 'GET') return send({
      user: u ? cleanUser(u) : null,
      csrf: sess?.csrf,
      demo: DEMO
    });
    let b = {};
    if (req.method !== 'GET' && !p.endsWith('/upload') && p !== '/api/register-complete' && !(/^\/api\/cases\/\d+\/(answer|attachments)$/.test(p) && (req.headers['content-type']||'').startsWith('multipart/form-data'))) {
      try {
        b = JSON.parse((await body(req)).toString() || '{}')
      } catch (e) {
        if (e.status) throw e;
        fail('بيانات غير صالحة')
      }
    }
    if (p === '/api/login' && req.method === 'POST') {
      rate('login:' + req.socket.remoteAddress);
      const email = str(b.email).toLowerCase();
      rate('email:' + email);
      let a = one('SELECT * FROM users WHERE email=?', email);
      if (!a || !check(typeof b.password === 'string' ? b.password : '', a.hash)) fail(
        'البريد أو كلمة المرور غير صحيحين', 401);
      if (sess) run('DELETE FROM sessions WHERE token=?', sess.token);
      const t = token(),
        csrf = token();
      run('INSERT INTO sessions VALUES(?,?,?,?)', digest(t), a.id, csrf, Date.now() + 8 * 3600000);
      res.setHeader('Set-Cookie',
        `imc=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${!DEMO?'; Secure':''}`);
      audit(a.id, 'login', a.id);
      return send({
        user: cleanUser(a),
        csrf
      })
    }
    if (p === '/api/register' && req.method === 'POST') fail(
      'استكمل جميع بيانات المنشأة والمصانع والمستندات من صفحة تسجيل منشأة');
    if (p === '/api/register-complete' && req.method === 'POST') {
      rate('register:' + req.socket.remoteAddress, 8);
      let fd;
      try {
        fd = await new Request('http://localhost', {
          method: 'POST',
          headers: {
            'content-type': req.headers['content-type'] || ''
          },
          body: await body(req, 120 * 1024 * 1024)
        }).formData()
      } catch {
        fail('تعذر قراءة ملف التسجيل')
      }
      let input;
      try {
        input = JSON.parse(fd.get('payload'))
      } catch {
        fail('بيانات التسجيل غير صالحة')
      }
      password(input.password);
      const email = str(input.email).toLowerCase();
      required(V.email(email),'ادخل بريدا الكترونيا صحيحا مثل name@example.com');
      required(V.fullName(input.name),'ادخل الاسم الكامل كما يظهر بالمستندات، اسمين على الاقل دون ارقام');
      required(V.mobile(input.phone),'ادخل رقم محمول مصري صحيحا من 11 رقما يبدأ بـ 010 او 011 او 012 او 015');
      input.phone=V.mobile(input.phone);
      const c = input.company || {},
        cd = companyData(c);
      required(cd.consent, 'الموافقة على صحة البيانات مطلوبة');
      const plants = input.factories;
      required(Array.isArray(plants) && plants.length >= 1 && plants.length <= 20,
        'أضف من مصنع واحد إلى عشرين مصنعًا');
      required(c.kind === 'multi' || plants.length === 1, 'حدد شركة متعددة المصانع');
      const pd = plants.map(plantData);
      required(!one('SELECT id FROM users WHERE email=?', email), 'البريد مسجل بالفعل', 409);
      required(!registrationDuplicate(c), 'يوجد ملف مسجل بنفس السجل أو الرقم الضريبي', 409);
      const needed = ['commercial', 'tax', ...plants.map((_, i) => 'industrial_' + i), ...(['legal','delegate'].includes(c.representative) ? ['authorization'] : [])];
      const files = [];
      for (const key of needed) files.push({
        key,
        ...await checkedFile(fd.get(key))
      });
      cd.fullRegistration = true;
      const written = [];
      let userId;
      db.exec('BEGIN');
      try {
        const company = Number(run(
          'INSERT INTO companies(name,commercial,tax,kind,representative,status,data,updated) VALUES(?,?,?,?,?,?,?,?)',
          str(c.name), V.digits(c.commercial).replace(/\s/g,''), V.digits(c.tax).replace(/[-\s]/g, ''), c.kind, c
          .representative, DEMO?'pending':'draft', JSON.stringify(cd), now()).lastInsertRowid);
        userId = Number(run('INSERT INTO users(email,name,phone,role,hash,company) VALUES(?,?,?,?,?,?)',
            email, str(input.name), str(input.phone), 'factory', hash(input.password), company)
          .lastInsertRowid);
        const ids = plants.map((f, i) => Number(run(
          'INSERT INTO factories(company,name,gov,city,region,sector,size,industrial,data) VALUES(?,?,?,?,?,?,?,?,?)',
          company, str(f.name), str(f.gov), str(f.city), regionForGovernorate(str(f.gov)), str(f.sector), f.size,
          V.digits(f.industrial), JSON.stringify(pd[i])).lastInsertRowid));
        for (const f of files) {
          const stored = token();
          fs.writeFileSync(DATA + '/uploads/' + stored, f.buf, {
            mode: 0o600
          });
          written.push(stored);
          const index = f.key.startsWith('industrial_') ? Number(f.key.split('_')[1]) : null;
          run('INSERT INTO files(company,factory,kind,name,stored,type,size,created) VALUES(?,?,?,?,?,?,?,?)',
            company, index === null ? null : ids[index], index === null ? f.key : 'industrial', f
            .name, stored, f.type, f.buf.length, now())
        }
        audit(userId, 'registration_complete', company);
        registrationEvent(company,userId,'registration_complete',null,DEMO?'pending':'draft','تم تسجيل بيانات المنشأة ومصانعها ومستنداتها');
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        for (const name of written) fs.unlinkSync(DATA + '/uploads/' + name);
        throw e
      }
      let mailSent = false;
      try {
        if(!DEMO){await mail(one('SELECT * FROM users WHERE id=?', userId), 'verify');mailSent=true}else notifyAdmins('ملف منشأة يحتاج اعتمادا',one('SELECT company FROM users WHERE id=?',userId).company)
      } catch {
        mailSent = false
      }
      return send({
        ok: true,
        mailSent,verificationRequired:!DEMO
      });
    }
    if (['/api/forgot', '/api/resend'].includes(p) && req.method === 'POST') {
      rate('recovery:' + req.socket.remoteAddress, 6);
      let a = one('SELECT * FROM users WHERE email=?', str(b.email).toLowerCase());
      if (a && (p === '/api/forgot' || !a.verified)) await mail(a, p === '/api/forgot' ? 'reset' :
        'verify');
      return send({
        ok: true,
        demo: DEMO
      })
    }
    if (['/api/verify', '/api/reset'].includes(p) && req.method === 'POST') {
      rate('token:' + req.socket.remoteAddress, 12);
      let purpose = p.slice(5);
      let t = one('SELECT * FROM tokens WHERE token=? AND purpose=? AND expires>?', digest(str(b
        .token)), purpose, Date.now());
      required(t, 'الرابط غير صالح أو انتهت صلاحيته');
      if (purpose === 'reset') {
        password(b.password);
        run('UPDATE users SET hash=? WHERE id=?', hash(b.password), t.user);
        run('DELETE FROM sessions WHERE user=?', t.user)
      } else {
        run('UPDATE users SET verified=1 WHERE id=?', t.user);
        const person = one('SELECT company FROM users WHERE id=?', t.user),
          company = one('SELECT * FROM companies WHERE id=?', person.company);
        if (company && company.status === 'draft' && JSON.parse(company.data).fullRegistration ===
          true && one('SELECT id FROM files WHERE company=? AND kind=?', company.id, 'tax')) {
          run("UPDATE companies SET status='pending',updated=? WHERE id=?", now(), company.id);
          registrationEvent(company.id,t.user,'registration_submitted',company.status,'pending','تم ارسال ملف المنشأة للمراجعة');audit(t.user, 'registration_submitted', company.id);notifyAdmins('ملف منشأة يحتاج اعتمادا',company.id)
        }
      }
      run('DELETE FROM tokens WHERE token=?', t.token);
      audit(t.user, purpose, t.user);
      return send({
        ok: true
      })
    }
    if (!p.startsWith('/api/')) {
      let rel = p === '/' ? 'index.html' : decodeURIComponent(p.slice(1));
      let f = path.resolve(ROOT, 'public', rel);
      if (!f.startsWith(path.resolve(ROOT, 'public') + path.sep) || !fs.existsSync(f) || !fs.statSync(f)
        .isFile()) fail('غير موجود', 404);
      const ext = path.extname(f);
      res.setHeader('Content-Type', ({
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.json':'application/json; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.ttf': 'font/ttf',
        '.pdf': 'application/pdf'
      })[ext] || 'application/octet-stream');
      return fs.createReadStream(f).pipe(res)
    }
    if (p === '/api/logout' && req.method === 'POST') {
      if(sess)run('DELETE FROM sessions WHERE token=?', sess.token);
      res.setHeader('Set-Cookie', 'imc=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return send({
        ok: true
      })
    }
    if(p==='/api/contact'&&req.method==='POST'){
      rate('contact:'+req.socket.remoteAddress,5);
      required(!str(b.website),'تعذر ارسال الرسالة');
      required(str(b.name,120).length>=3&&V.job(b.name)&&V.email(str(b.email))&&V.mobile(b.phone),'راجع الاسم والبريد ورقم المحمول');
      required(str(b.message,3000).length>=10,'اكتب استفسارا من 10 احرف على الاقل');
      const reference='CNT-'+token().slice(0,12).toUpperCase();
      db.exec('BEGIN');try{const ticket=Number(run('INSERT INTO support_tickets(user,subject,category,guest_name,guest_email,guest_phone,source,public_reference,created,updated) VALUES(NULL,?,?,?,?,?,?,?,?,?)',str(b.subject)||'استفسار من زائر المنصة','other',str(b.name,120),str(b.email).toLowerCase(),V.mobile(b.phone),'guest',reference,now(),now()).lastInsertRowid);run('INSERT INTO support_messages(ticket,actor,message,created) VALUES(?,NULL,?,?)',ticket,str(b.message,3000),now());notifyAdmins('استفسار جديد من زائر المنصة',ticket);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return send({ok:true,reference},201)
    }
    if (!u) fail('سجل الدخول للمتابعة', 401);
    const admin = () => {
      if (u.role !== 'admin') fail('غير مسموح', 403)
    };
    const factoryUser = () => {
      if (u.role !== 'factory') fail('غير مسموح', 403)
    };
    if (p === '/api/password' && req.method === 'POST') {
      required(check(typeof b.current === 'string' ? b.current : '', u.hash),
        'كلمة المرور الحالية غير صحيحة');
      password(b.password);
      run('UPDATE users SET hash=? WHERE id=?', hash(b.password), u.id);
      run('DELETE FROM sessions WHERE user=?', u.id);
      return send({
        ok: true
      })
    }
    if (p === '/api/mail' && req.method === 'GET') {
      if (!DEMO) fail('غير موجود', 404);
      return send(all('SELECT * FROM mail WHERE user=? ORDER BY id DESC', u.id))
    }
    if (p === '/api/notices') {
      if (req.method === 'POST') {
        run('UPDATE notices SET seen=1 WHERE user=?', u.id);
        return send({
          ok: true
        })
      }
      return send(all('SELECT * FROM notices WHERE user=? ORDER BY id DESC LIMIT 50', u.id))
    }
    if (p === '/api/profile' && req.method === 'GET') {
      factoryUser();
      return send({
        company: one('SELECT * FROM companies WHERE id=?', u.company),
        factories: all('SELECT * FROM factories WHERE company=?', u.company),
        files: all(
          'SELECT id,name,kind,factory,size FROM files WHERE company=? AND case_id IS NULL', u
          .company)
      })
    }
    if (p === '/api/profile' && req.method === 'POST') {
      factoryUser();
      let c = one('SELECT * FROM companies WHERE id=?', u.company);
      required(['draft', 'needs_info', 'rejected'].includes(c.status),
        'لا يمكن تعديل ملف قيد المراجعة أو معتمد');
      required(str(b.name).length >= 3, 'اسم المنشأة مطلوب');
      required(['single', 'multi'].includes(b.kind), 'حدد نوع التسجيل');
      required(['owner', 'legal', 'delegate'].includes(b.representative), 'حدد صفة مقدم الطلب');
      required(/^\d{9}$/.test(V.digits(b.tax).replace(/[-\s]/g, '')), 'رقم التسجيل الضريبي 9 أرقام');
      required(V.digits(b.commercial).replace(/\s/g,''), 'رقم السجل التجاري مطلوب');
      run('UPDATE companies SET name=?,commercial=?,tax=?,kind=?,representative=?,data=?,updated=? WHERE id=?',
        str(b.name), V.digits(b.commercial).replace(/\s/g,''), V.digits(b.tax).replace(/[-\s]/g, ''), b.kind, b.representative,
        JSON.stringify({
          ...JSON.parse(c.data),
          ...companyData(b)
        }), now(), u.company);
      return send({
        ok: true
      })
    }
    if (p === '/api/factories' && req.method === 'POST') {
      factoryUser();
      let c = one('SELECT * FROM companies WHERE id=?', u.company);
      required(c.status !== 'pending', 'انتظر قرار مراجعة التسجيل');
      for (let k of ['name', 'gov', 'city', 'sector', 'size', 'industrial']) required(str(b[k]),
        'أكمل بيانات المصنع');
      required(['small', 'medium', 'large', 'micro', 'unknown'].includes(b.size), 'فئة حجم غير صالحة');
      run('INSERT INTO factories(company,name,gov,city,region,sector,size,industrial,data) VALUES(?,?,?,?,?,?,?,?,?)',
        u.company, str(b.name), str(b.gov), str(b.city), regionForGovernorate(str(b.gov)), str(b.sector), b.size, V.digits(b.industrial), JSON.stringify({
          ...plantData(b)
        }));
      if(one('SELECT COUNT(*) n FROM factories WHERE company=?',u.company).n>1)run("UPDATE companies SET kind='multi',updated=? WHERE id=?",now(),u.company);
      audit(u.id, 'factory_added', u.company);notifyAdmins('مصنع جديد يحتاج مراجعة',u.company);
      return send({
        ok: true
      })
    }
    if (/^\/api\/factories\/\d+$/.test(p) && req.method === 'POST') {
      factoryUser();
      const f = one('SELECT * FROM factories WHERE id=? AND company=?', id(p.split('/').pop()), u
          .company),
        c = one('SELECT status FROM companies WHERE id=?', u.company);
      required(f, 'مصنع غير موجود', 404);
      required(c.status !== 'pending' && f.status !== 'approved', 'البيانات قيد المراجعة أو معتمدة');
      for (const k of ['name', 'gov', 'city', 'sector', 'size', 'industrial']) required(str(b[k]),
        'أكمل بيانات المصنع');
      required(['small', 'medium', 'large', 'micro', 'unknown'].includes(b.size), 'فئة حجم غير صالحة');
      run('UPDATE factories SET name=?,gov=?,city=?,region=?,sector=?,size=?,industrial=?,data=? WHERE id=?',
        str(b.name), str(b.gov), str(b.city), regionForGovernorate(str(b.gov)), str(b.sector), b.size, V.digits(b.industrial),
        JSON.stringify({
          ...plantData(b)
        }), f.id);
      audit(u.id, 'factory_updated', f.id);
      return send({
        ok: true
      })
    }
    if (p === '/api/registration/submit' && req.method === 'POST') {
      factoryUser();
      required(DEMO||u.verified, 'أكد بريدك أولا');
      let c = one('SELECT * FROM companies WHERE id=?', u.company);
      required(['draft', 'needs_info', 'rejected'].includes(c.status),
        'التسجيل بالفعل قيد المراجعة أو معتمد');
      required(c.name && c.tax && JSON.parse(c.data).consent,
        'أكمل ملف المنشأة ووافق على معالجة البيانات');
      required(!registrationDuplicate({...c,...JSON.parse(c.data)},u.company),
        'يوجد ملف مسجل بنفس الرقم الضريبي أو السجل التجاري. يرجى التواصل مع إدارة المركز');
      const fs = all('SELECT * FROM factories WHERE company=?', u.company);
      required(fs.length, 'أضف مصنعًا واحدًا على الأقل');
      required(c.kind !== 'single' || fs.length === 1, 'اختر شركة متعددة المصانع في بيانات المنشأة');
      let docs = all('SELECT * FROM files WHERE company=? AND case_id IS NULL', u.company);
      for (let k of ['commercial', 'tax']) required(docs.some(d => d.kind === k),
        'ارفع السجل التجاري والبطاقة الضريبية');
      if (['legal','delegate'].includes(c.representative)) required(docs.some(d => d.kind === 'authorization'),
        'ارفع التفويض');
      for (let f of fs) required(docs.some(d => d.kind === 'industrial' && d.factory === f.id),
        'ارفع السجل الصناعي لكل مصنع');
      db.exec('BEGIN');try{
      run('UPDATE companies SET status=?,reason=?,updated=? WHERE id=?', 'pending', '', now(), u
        .company);
      registrationEvent(u.company,u.id,'registration_submitted',c.status,'pending',c.status==='needs_info'?'استكملت المنشأة البيانات واعادت الملف للمراجعة':'ارسلت المنشأة ملفها للمراجعة');audit(u.id, 'registration_submitted', u.company);notifyAdmins('ملف منشأة يحتاج اعتمادا',u.company);
      db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
      return send({
        ok: true
      })
    }
    if (p === '/api/upload' && req.method === 'POST') {
      factoryUser();
      let fd;
      try {
        fd = await new Request('http://localhost', {
          method: 'POST',
          headers: {
            'content-type': req.headers['content-type'] || ''
          },
          body: await body(req, 6 * 1024 * 1024)
        }).formData()
      } catch (e) {
        if (e.status) throw e;
        fail('ملف غير صالح')
      }
      let file = fd.get('file'),
        kind = str(fd.get('kind')),
        caseId = fd.get('case_id') ? id(fd.get('case_id')) : null,
        factoryId = fd.get('factory') ? id(fd.get('factory')) : null;
      required(file && file.size > 0 && file.size <= 5 * 1024 * 1024, 'الحد الأقصى للملف 5 MB');
      required(['commercial', 'tax', 'industrial', 'authorization', 'license', 'extra', 'attachment']
        .includes(kind), 'نوع مستند غير صالح');
      if (caseId) {
        let c = getCase(caseId, u);
        required(!['closed', 'solved'].includes(c.status), 'لا يمكن رفع مرفق لطلب منتهٍ');
        required(kind === 'attachment', 'نوع مرفق غير صالح')
      } else {
        const c = one('SELECT * FROM companies WHERE id=?', u.company);
        required(c.status !== 'pending', 'المستندات قيد المراجعة');
        if (c.status === 'approved') required(kind === 'industrial' && factoryId && one(
          "SELECT id FROM factories WHERE id=? AND company=? AND status='pending'", factoryId, u
          .company), 'ملف المنشأة معتمد. يمكن رفع سجلات المصانع الجديدة فقط');
      }
      if (factoryId) required(one('SELECT id FROM factories WHERE id=? AND company=?', factoryId, u
        .company), 'مصنع غير صالح');
      if (kind === 'industrial') required(factoryId, 'حدد المصنع');
      let buf = Buffer.from(await file.arrayBuffer()),
        type = '',
        ext = path.extname(file.name).toLowerCase();
      if (buf.subarray(0, 5).toString() === '%PDF-' && ext === '.pdf') type = 'application/pdf';
      if (buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && ext === '.png') type =
        'image/png';
      if (buf[0] === 255 && buf[1] === 216 && ['.jpg', '.jpeg'].includes(ext)) type = 'image/jpeg';
      required(type, 'يُسمح بـ PDF أو PNG أو JPG فقط وبمحتوى مطابق');
      let count = one('SELECT COUNT(*) n FROM files WHERE company=?', u.company).n;
      required(count < 100, 'وصلت إلى حد الملفات للمنشأة');
      if (!DEMO) {
        let r = await fetch(process.env.SCAN_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `Bearer ${process.env.SCAN_WEBHOOK_KEY||''}`
          },
          body: buf,
          signal: AbortSignal.timeout(15000)
        });
        required(r.ok && (await r.json()).clean === true, 'تعذر اعتماد فحص الملف')
      }
      let stored = token();
      fs.writeFileSync(DATA + '/uploads/' + stored, buf, {
        mode: 0o600
      });
      run('INSERT INTO files(company,case_id,factory,kind,name,stored,type,size,created,uploaded_by) VALUES(?,?,?,?,?,?,?,?,?,?)',
        u.company, caseId, factoryId, kind, str(file.name, 120), stored, type, buf.length, now(),u.id);
      audit(u.id, 'file_uploaded', u.company);
      return send({
        ok: true
      })
    }
    if (/^\/api\/files\/\d+$/.test(p) && req.method === 'GET') {
      let f = one('SELECT * FROM files WHERE id=?', id(p.split('/').pop()));
      if (!f || (u.role !== 'admin' && f.company !== u.company)) fail('غير موجود', 404);
      if(f.case_id)getCase(f.case_id,u);
      audit(u.id, 'file_download', f.id);
      res.setHeader('Content-Type', f.type);
      res.setHeader('Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`);
      return fs.createReadStream(DATA + '/uploads/' + f.stored).pipe(res)
    }
    if (p === '/api/cases' && req.method === 'GET') {const records=u.role === 'admin' ? all(
      "SELECT cases.*,companies.name company_name FROM cases JOIN companies ON companies.id=cases.company WHERE cases.status!='draft' AND cases.deleted_at IS NULL ORDER BY updated DESC"
    ) : all(
      "SELECT id,company,user,title,status,form,created,updated,version,deleted_at FROM cases WHERE company=? AND ((?=1 AND deleted_at IS NOT NULL AND status='draft') OR (?=0 AND deleted_at IS NULL)) ORDER BY updated DESC",
      u.company,url.searchParams.get('deleted')==='1'?1:0,url.searchParams.get('deleted')==='1'?1:0);return send(records.map(c=>{let f=JSON.parse(c.form||'{}');const ids=[f.factory,...(f.additionalFactoryIds||[])].map(String);return {...c,closure_pending:!!one("SELECT id FROM case_closure_requests WHERE case_id=? AND status='pending'",c.id),company_name:c.company_name||one('SELECT name FROM companies WHERE id=?',c.company)?.name,factory_names:all('SELECT id,name FROM factories WHERE company=?',c.company).filter(p=>ids.includes(String(p.id))).map(p=>p.name).join('، ')}}));}

    if (p === '/api/cases' && req.method === 'POST') {
      factoryUser();
      required((DEMO||u.verified) && one('SELECT status FROM companies WHERE id=?', u.company).status ===
        'approved', 'يجب اعتماد المنشأة أولًا');
      let f = b.form || {};
      required(JSON.stringify(f).length < 60000, 'بيانات كثيرة');
      if (b.submit) validateForm(f, u);else required(R.meaningfulDraft(f)||(f.factory&&String(f.factory)!==String(one('SELECT id FROM factories WHERE company=? ORDER BY id LIMIT 1',u.company)?.id)),'ابدأ باختيار نوع الطلب لحفظ المسودة');
      const n = run(
        'INSERT INTO cases(company,user,title,status,form,created,updated) VALUES(?,?,?,?,?,?,?)', u
        .company, u.id, str(f.opName || f.unclearDetail || f.note || ({
          challenge: 'تحد فني',
          improve: 'فرصة تحسين',
          lab: 'طلب فحص أو اختبار',
          idea: 'فكرة تطوير',
          localize: 'بديل محلي'
        } [f.kind]) || 'مسودة جديدة', 150), b.submit ? 'submitted' : 'draft', JSON.stringify(f),
        now(), now()).lastInsertRowid;
      const c = one('SELECT * FROM cases WHERE id=?', n);
      if(b.submit)event(c,u,'submitted','تم ارسال الطلب الى المركز');
      return send(c)
    }
    let m = p.match(/^\/api\/cases\/(\d+)(?:\/(\w+))?$/);
    if (m) {
      let c = getCase(m[1], u, ['restore','purge'].includes(m[2])&&u.role==='factory'),
        action = m[2];
      if(req.method==='DELETE'&&!action){factoryUser();required(c.status==='draft','لا يمكن حذف طلب وصل الى المركز. ارسل طلب اغلاق');required(b.confirm===true,'اكد حذف المسودة');required(b.version===c.version,'تغير الطلب. حدث القائمة وحاول مرة اخرى',409);run('UPDATE cases SET deleted_at=?,deleted_by=?,version=version+1 WHERE id=?',now(),u.id,c.id);audit(u.id,'draft_deleted',c.id);return send({ok:true})}
      if(req.method==='DELETE'&&action==='purge'){factoryUser();const result=purgeDraft(c,u,b);return send(result,result.cleanupPending?202:200)}
      if(req.method==='POST'&&action==='restore'){factoryUser();required(c.status==='draft'&&c.deleted_at,'الاستعادة من السلة متاحة للمسودات فقط');required(b.version===c.version,'تغير الطلب. حدث القائمة وحاول مرة اخرى',409);run('UPDATE cases SET deleted_at=NULL,deleted_by=NULL,version=version+1,updated=? WHERE id=?',now(),c.id);audit(u.id,'draft_restored',c.id);return send({ok:true})}
      if(req.method==='POST'&&action==='closure'){factoryUser();return send(requestClosure(c,u,b))}
      if(req.method==='POST'&&action==='closuredecision'){admin();return send(decideClosure(c,u,b))}
      if (req.method === 'GET' && !action) {
        return send({
          ...c,
          closureRequests:closureRecords(c.id),
          assessment: u.role === 'admin' ? JSON.parse(c.assessment) : undefined,
          workflow: publicWorkflow(c),
          informationRequests:all('SELECT * FROM info_requests WHERE case_id=? ORDER BY id DESC',c.id).map(r=>({...r,answers:all('SELECT info_answers.*,users.name actor_name FROM info_answers LEFT JOIN users ON users.id=actor WHERE request=? ORDER BY info_answers.id',r.id).map(a=>({...a,files:all('SELECT id,name,size,created FROM files WHERE info_answer=? AND case_id=?',a.id,c.id)}))})),
          projectUpdates:all('SELECT project_updates.*,users.name actor_name FROM project_updates LEFT JOIN users ON users.id=actor WHERE case_id=? ORDER BY project_updates.id DESC',c.id),
          factories: all('SELECT id,name FROM factories WHERE company=?', c.company),
          events: all(
            'SELECT events.*,users.name actor_name,users.role actor_role FROM events LEFT JOIN users ON users.id=events.actor WHERE case_id=? AND (?=1 OR internal=0) ORDER BY events.id',
            c.id, u.role === 'admin' ? 1 : 0),
          files: all('SELECT files.id,files.name,files.kind,files.size,files.created,files.info_answer,users.name uploaded_by_name FROM files LEFT JOIN users ON users.id=files.uploaded_by WHERE files.case_id=? ORDER BY files.id DESC', c.id),
          company_name: one('SELECT name FROM companies WHERE id=?', c.company)?.name
        })
      }
      if (req.method === 'POST' && !action) {
        factoryUser();
        required((DEMO||u.verified) && one('SELECT status FROM companies WHERE id=?', u.company).status ===
          'approved', 'يجب اعتماد المنشأة أولًا');
        required(c.status === 'draft', 'لا يمكن تعديل الطلب بعد الإرسال');
        required(c.version === b.version, 'تم تحديث المسودة. أعد فتحها', 409);
        if (b.submit) validateForm(b.form, u);
        run('UPDATE cases SET form=?,title=?,status=?,updated=?,version=version+1 WHERE id=?', JSON
          .stringify(b.form), str(b.form.opName || b.form.unclearDetail || b.form.note || c.title,
            150), b.submit ? 'submitted' : 'draft', now(), c.id);
        if (b.submit) event(c, u, 'submitted', 'تم إرسال الطلب إلى المركز');
        return send(one('SELECT * FROM cases WHERE id=?', c.id))
      }
      if(req.method==='POST'&&['answer','attachments'].includes(action)){
        factoryUser();let uploads=[];
        if((req.headers['content-type']||'').startsWith('multipart/form-data')){const fd=await multipart(req);b=Object.fromEntries(fd);uploads=fd.getAll('attachments').filter(f=>typeof f!=='string'&&f.size>0)}
        required(uploads.length<=5,'يمكن ارفاق خمسة ملفات في المرة الواحدة');
        required(one('SELECT COUNT(*) n FROM files WHERE company=?',u.company).n+uploads.length<=100,'وصلت الى حد الملفات للمنشأة');
        let request;
        if(action==='answer'){required(c.status==='needs_info','الطلب لم يعد في انتظار استكمال');required(str(b.message,3000).length>=3,'اكتب ردك على طلب الاستكمال');request=Number(b.request)?one("SELECT * FROM info_requests WHERE id=? AND case_id=? AND status='open'",id(b.request),c.id):one("SELECT * FROM info_requests WHERE case_id=? AND status='open' ORDER BY id DESC LIMIT 1",c.id);required(request||Number(b.request)===0,'طلب الاستكمال غير مفتوح')}
        else {required(!['closed','solved'].includes(c.status),'لا يمكن رفع مرفق لطلب منته');required(uploads.length,'اختر ملفا واحدا على الاقل')}
        const checked=[];for(const file of uploads)checked.push(await checkedFile(file));const written=[];
        db.exec('BEGIN');try{
          let answer=null;
          if(action==='answer'){if(!request){const old=one("SELECT message,actor FROM events WHERE case_id=? AND kind='needs_info' ORDER BY id DESC LIMIT 1",c.id);request={id:Number(run('INSERT INTO info_requests(case_id,actor,question,created) VALUES(?,?,?,?)',c.id,old?.actor||null,old?.message||'استكمال بيانات الطلب',now()).lastInsertRowid)}}answer=Number(run('INSERT INTO info_answers(request,actor,message,created) VALUES(?,?,?,?)',request.id,u.id,str(b.message,3000),now()).lastInsertRowid);run("UPDATE info_requests SET status='answered',answered=? WHERE id=?",now(),request.id)}
          for(const file of checked){const stored=token();fs.writeFileSync(DATA+'/uploads/'+stored,file.buf,{mode:0o600});written.push(stored);run('INSERT INTO files(company,case_id,kind,name,stored,type,size,created,info_answer,uploaded_by) VALUES(?,?,?,?,?,?,?,?,?,?)',u.company,c.id,'attachment',file.name,stored,file.type,file.buf.length,now(),answer,u.id)}
          run('UPDATE cases SET status=?,version=version+1,updated=? WHERE id=?',action==='answer'?'under_review':c.status,now(),c.id);
          if(action==='answer')event(c,u,'under_review','تم استلام رد المنشأة على طلب الاستكمال: '+str(b.message,3000));else if(c.status!=='draft')event(c,u,'attachments','تمت اضافة مرفقات جديدة الى الطلب');
          db.exec('COMMIT');return send({ok:true,attachments:checked.length,answer})
        }catch(e){db.exec('ROLLBACK');for(const name of written)fs.unlinkSync(DATA+'/uploads/'+name);throw e}
      }
      if (req.method === 'POST' && action === 'comment') {
        required(str(b.message, 3000), 'اكتب الرسالة');
        if (u.role !== 'admin') required(!['draft', 'closed', 'solved'].includes(c.status),
          'لا يمكن الرد في هذه الحالة');
        let internal = u.role === 'admin' && b.internal === true;
        event(c, u, 'comment', str(b.message, 3000), internal ? 1 : 0);
        if (u.role !== 'admin' && c.status === 'needs_info') {
          const request=one("SELECT id FROM info_requests WHERE case_id=? AND status='open' ORDER BY id DESC LIMIT 1",c.id);if(request){run('INSERT INTO info_answers(request,actor,message,created) VALUES(?,?,?,?)',request.id,u.id,str(b.message,3000),now());run("UPDATE info_requests SET status='answered',answered=? WHERE id=?",now(),request.id)}
          run('UPDATE cases SET status=?,version=version+1,updated=? WHERE id=?', 'under_review', now(),
            c.id);
          event(c, u, 'under_review', 'وصل رد المصنع وجارٍ مراجعته')
        }
        return send({
          ok: true
        })
      }
      if (req.method === 'POST' && action === 'review') {
        admin();
        required(b.version === c.version, 'حدث تغيير في الطلب. أعد فتحه');
        const status = b.status || c.status;
        if(b.infoDue)required(/^\d{4}-\d{2}-\d{2}$/.test(b.infoDue),'موعد الرد غير صالح');
        required(status === c.status || transitions[c.status]?.includes(status),
          'انتقال حالة غير مسموح');
        required(str(b.message, 2000), 'اكتب رسالة للمصنع توضح الإجراء');
        const previous = JSON.parse(c.assessment);
        let assessment = {
          ...previous,
          priority: b.priority===undefined?(previous.priority||'medium'):['low','medium','high'].includes(b.priority)?b.priority:'medium',
          classification: b.classification===undefined?(previous.classification||''):str(b.classification),
          suitability: b.suitability===undefined?(previous.suitability||''):str(b.suitability),
          related: b.related===undefined?(previous.related||null):b.related?id(b.related):null,
          outcome: b.outcome===undefined?(previous.outcome||''):str(b.outcome),
          evidence: b.evidence===undefined?(previous.evidence||''):str(b.evidence,2000)
        };
        for (const key of ['partner', 'program', 'sector']) {
          if (b[key] !== undefined) {
            const val = b[key] ? id(b[key]) : null;
            if (val) {
              const partner = one('SELECT * FROM partners WHERE id=? AND active=1', val);
              required(partner, 'الجهة غير مسجلة أو غير نشطة');
              required(key === 'partner' ? ['university', 'research', 'lab'].includes(partner.kind) :
                partner.kind === key, 'نوع جهة غير صالح')
            }
            assessment[key] = val;
          }
        }
        for (const key of ['owner', 'due', 'executionNote'])
          if (b[key] !== undefined) assessment[key] = str(b[key], 1000);
        if (assessment.due) required(/^\d{4}-\d{2}-\d{2}$/.test(assessment.due),
          'تاريخ مستهدف غير صالح');
        if (['assigned', 'in_progress', 'solved'].includes(status)) required(assessment.partner,
          'اختر جهة مسجلة قبل الإسناد أو التنفيذ');
        if (status === 'solved') {
          required(c.status === 'in_progress' || c.status === 'solved',
            'توثيق الحل يأتي بعد بدء التنفيذ');
          assessment.outcome = 'solved';
          required(assessment.evidence.length >= 10, 'وثّق نتيجة الحل والدليل');
        }
        if (status === 'closed') required(['not_eligible', 'withdrawn', 'not_feasible', 'duplicate']
          .includes(assessment.outcome), 'حدد سبب الإغلاق دون تنفيذ');
        if (status !== 'solved') required(assessment.outcome !== 'solved',
          'اختر حالة تم الحل لتوثيق الحل');
        if (assessment.related) {
          required(assessment.related !== c.id && one(
              "SELECT id FROM cases WHERE id=? AND status!='draft'", assessment.related),
            'طلب مرتبط غير صالح')
        }
        if (assessment.outcome === 'solved') required(assessment.evidence.length >= 10,
          'توثيق نتيجة الحل مطلوب');
        db.exec('BEGIN');
        try {
          run('UPDATE cases SET status=?,assessment=?,version=version+1,updated=? WHERE id=?', status,
            JSON.stringify(assessment), now(), c.id);
          if(c.status==='needs_info'&&status!=='needs_info')run("UPDATE info_requests SET status='superseded' WHERE case_id=? AND status='open'",c.id);
          if(status==='needs_info'){run("UPDATE info_requests SET status='superseded' WHERE case_id=? AND status='open'",c.id);run('INSERT INTO info_requests(case_id,actor,question,fields,documents,due,created) VALUES(?,?,?,?,?,?,?)',c.id,u.id,str(b.message,2000),str(b.requestedFields,1500),str(b.requestedDocuments,1500),str(b.infoDue,10),now());}
          if(b.phase||b.progress!==undefined||b.projectNote){required(assessment.partner&&['assigned','in_progress','solved'].includes(status),'تحديث المشروع يحتاج اسناد الطلب الى جهة وبدء مسار التنفيذ');if(status==='solved')required(Number(b.progress)===100,'توثيق الحل يتطلب تسجيل اكتمال التنفيذ');required(['scoping','planning','research','prototype','testing','handover'].includes(b.phase),'اختر مرحلة عمل المشروع');required(Number.isInteger(Number(b.progress))&&Number(b.progress)>=0&&Number(b.progress)<=100,'نسبة التنفيذ من 0 الى 100');required(str(b.projectNote,3000).length>=10,'اكتب تحديثا واضحا عن تقدم المشروع');run('INSERT INTO project_updates(case_id,actor,phase,progress,note,source,created) VALUES(?,?,?,?,?,?,?)',c.id,u.id,b.phase,Number(b.progress),str(b.projectNote,3000),'imc',now());}
          finalizeClosureOnReview(c,u,status,str(b.message,2000));
          event(c, u, status, str(b.message, 2000));
          db.exec('COMMIT')
        } catch (e) {
          db.exec('ROLLBACK');
          throw e
        }
        return send({
          ok: true
        })
      }
    }
    if (p === '/api/admin/partners') {
      admin();
      if (req.method === 'GET') return send(all('SELECT * FROM partners ORDER BY name'));
      if (req.method === 'POST') {
        required(partnerKinds.includes(b.kind) && str(b.name).length >= 3, 'حدد نوع الجهة واسمها');
        required(!one('SELECT id FROM partners WHERE kind=? AND name=?', b.kind, str(b.name)),
          'الجهة مسجلة بالفعل');
        const n = run('INSERT INTO partners(kind,name,code,contact,created) VALUES(?,?,?,?,?)', b.kind,
          str(b.name), str(b.code, 80), str(b.contact), now()).lastInsertRowid;
        audit(u.id, 'partner_added', n);
        return send({
          ok: true
        })
      }
    }
    if (p === '/api/admin/registrations-export' && req.method === 'GET') {
      admin();
      const companies = all("SELECT * FROM companies WHERE status!='draft' ORDER BY id"),
        plants = all("SELECT factories.* FROM factories JOIN companies ON companies.id=factories.company WHERE companies.status!='draft' ORDER BY factories.company,factories.id");
      const labels = {
        draft: 'غير مرسل',
        pending: 'قيد الاعتماد',
        approved: 'معتمد',
        needs_info: 'مطلوب استكمال',
        rejected: 'غير معتمد',
        single: 'مصنع واحد',
        multi: 'عدة مصانع',
        owner: 'صاحب المنشأة',
        legal: 'ممثل قانوني',
        delegate: 'مفوض',
        small: 'من مليون إلى 50 مليون',
        medium: 'أكثر من 50 إلى 200 مليون',
        large: 'أكثر من 200 مليون',
        micro: 'أقل من مليون',
        unknown: 'منشأة جديدة'
      };
      const data = companies.map(c => {
        const d = JSON.parse(c.data),
          u = one('SELECT name,email,phone,verified FROM users WHERE company=? ORDER BY id LIMIT 1',
            c.id) || {};
        return [c.id, c.name, labels[c.status] || c.status, c.reason, c.commercial, c.tax, labels[c
            .kind] || c.kind, labels[c.representative] || c.representative, d.address, d
          .imcClient ? 'نعم' : 'لا', d.imcCode, u.name, u.email, u.phone, u.verified ? 'نعم' :
          'لا', d.job, plants.filter(f => f.company === c.id).length, c.updated
        ]
      });
      const pdata = plants.map(f => {
        const d = JSON.parse(f.data);
        return [f.id, f.company, companies.find(c => c.id === f.company)?.name, f.name, labels[f
            .status] || f.status, f.industrial, f.region, f.gov, f.city, f.sector, d.subsector,
          labels[f.size] || f.size, d.year, d.address, d.locationType==='industrial'?'داخل منطقة صناعية':d.locationType==='outside'?'خارج منطقة صناعية':'',d.industrialZone
        ]
      });
      const out = xlsx([{
        name: 'المنشآت',
        rows: [
          ['المرجع', 'الاسم القانوني', 'حالة الاعتماد', 'سبب القرار', 'السجل التجاري',
            'الرقم الضريبي', 'نوع التسجيل', 'صفة الممثل', 'المقر', 'عميل IMC', 'كود العميل',
            'مقدم الطلب', 'البريد', 'الهاتف', 'البريد مؤكد', 'الوظيفة', 'عدد المصانع',
            'آخر تحديث'
          ], ...data
        ]
      }, {
        name: 'المصانع',
        rows: [
          ['مرجع المصنع', 'مرجع الشركة', 'الشركة', 'المصنع', 'حالة الاعتماد', 'السجل الصناعي',
            'المنطقة', 'المحافظة', 'المدينة', 'القطاع', 'النشاط الفرعي', 'نطاق المبيعات',
            'السنة المالية', 'العنوان', 'موقع المصنع', 'المنطقة الصناعية'
          ], ...pdata
        ]
      }]);
      audit(u.id, 'export', 'registrations_xlsx');
      res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="IMC_Establishments.xlsx"');
      return res.end(out)
    }
    if (p === '/api/admin/registrations' && req.method === 'GET') {
      admin();
      return send(all("SELECT * FROM companies WHERE status!='draft' ORDER BY updated DESC").map(c => ({
        ...c,factory_names:all('SELECT name FROM factories WHERE company=?',c.id).map(f=>f.name).join('، '),
        pending_factories: one(
          "SELECT COUNT(*) n FROM factories WHERE company=? AND status='pending'", c.id).n,
        duplicates: all(
          'SELECT id,name FROM companies WHERE id!=? AND ((tax=? AND length(tax)>0) OR (commercial=? AND length(commercial)>0) OR (name=? AND length(name)>0))',
          c.id, c.tax, c.commercial, c.name)
      })))
    }
    m = p.match(/^\/api\/admin\/registrations\/(\d+)$/);
    if (m) {
      admin();
      let c = one('SELECT * FROM companies WHERE id=?', id(m[1]));
      required(c, 'ملف غير موجود');
      if (req.method === 'GET') return send({
        history:all('SELECT h.*,users.name actor_name,users.role actor_role FROM registration_history h LEFT JOIN users ON users.id=h.actor WHERE h.company=? ORDER BY h.id DESC',c.id),
        company: c,
        users: all('SELECT name,email,phone,verified FROM users WHERE company=?', c.id),
        factories: all('SELECT * FROM factories WHERE company=?', c.id),
        files: all(
          'SELECT id,name,kind,factory,size FROM files WHERE company=? AND case_id IS NULL', c
          .id)
      });
      if (req.method === 'POST') {
        required(['approved', 'needs_info', 'rejected'].includes(b.status), 'قرار غير صالح');
        if(b.status==='approved')b.reason='تم اعتماد المنشأة والمصانع بعد مراجعة البيانات والمستندات';else required(str(b.reason,2000),'اكتب سبب القرار وما المطلوب من المنشأة');
        required(c.status === 'pending' || c.status === 'approved', 'الملف ليس جاهزًا للمراجعة');
        required(c.status!=='approved'||one("SELECT id FROM factories WHERE company=? AND status='pending'",c.id),'المنشأة معتمدة بالفعل ولا توجد مصانع جديدة للمراجعة');
        if (b.status === 'approved') {
          required(DEMO||one('SELECT id FROM users WHERE company=? AND verified=1', c.id),
            'لم يؤكد المستخدم بريده');
          required(b.checked === true, 'أكد مراجعة المستندات والبيانات');
          const docs = all('SELECT kind,factory FROM files WHERE company=? AND case_id IS NULL', c.id);
          for (const k of ['commercial', 'tax']) required(docs.some(d => d.kind === k),
            'مستندات الشركة غير مكتملة');
          if (['legal','delegate'].includes(c.representative)) required(docs.some(d => d.kind === 'authorization'),
            'التفويض مطلوب');
          const plants = all('SELECT id FROM factories WHERE company=?', c.id);
          required(plants.length, 'لا توجد مصانع');
          for (const f of plants) required(docs.some(d => d.kind === 'industrial' && d.factory === f
            .id), 'السجل الصناعي مطلوب لكل مصنع')
        }
        db.exec('BEGIN');try{
        run('UPDATE companies SET status=?,reason=?,updated=? WHERE id=?', b.status, str(b.reason,
          2000), now(), c.id);
        run('UPDATE factories SET status=? WHERE company=?', b.status === 'approved' ? 'approved' :
          'pending', c.id);
        notify(c.id, 'قرار التسجيل: ' + str(b.reason, 2000));
        registrationEvent(c.id,u.id,'registration_'+b.status,c.status,b.status,str(b.reason,2000));audit(u.id, 'registration_' + b.status, c.id);
        db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
        return send({
          ok: true
        })
      }
    }
    if(p==='/api/actions'&&req.method==='GET'){admin();const from=R.digits(str(url.searchParams.get('from'),10)),to=R.digits(str(url.searchParams.get('to'),10)),action=str(url.searchParams.get('action'),60);required(R.validDay(from)&&R.validDay(to)&&(!from||!to||from<=to),'اختر فترة تاريخ صحيحة');let rows=all("SELECT audit.*,users.name actor_name FROM audit JOIN users ON users.id=audit.actor WHERE users.role='admin' AND action NOT IN ('login','file_download','export') AND (?='' OR action=?) ORDER BY audit.id DESC",action,action);if(from||to)rows=rows.filter(e=>R.within(e.created,from,to));return send(rows.slice(0,1000))}
    if(p==='/api/tasks'&&req.method==='GET'){admin();return send({registrations:all("SELECT id,name FROM companies WHERE status='pending'"),plants:all("SELECT factories.id,factories.name,factories.company FROM factories JOIN companies ON companies.id=factories.company WHERE factories.status='pending' AND companies.status='approved'"),requests:all("SELECT cases.id,cases.title,cases.status,EXISTS(SELECT 1 FROM case_closure_requests r WHERE r.case_id=cases.id AND r.status='pending') closure_pending FROM cases WHERE cases.deleted_at IS NULL AND (cases.status IN ('submitted','under_review','assessment','assessed') OR EXISTS(SELECT 1 FROM case_closure_requests r WHERE r.case_id=cases.id AND r.status='pending')) ORDER BY closure_pending DESC,updated"),support:all("SELECT id,subject FROM support_tickets WHERE status IN ('open','waiting_admin')")})}
    if(p==='/api/support'){if(req.method==='GET')return send(u.role==='admin'?all('SELECT support_tickets.*,COALESCE(users.name,support_tickets.guest_name) applicant FROM support_tickets LEFT JOIN users ON users.id=support_tickets.user ORDER BY updated DESC'):all('SELECT * FROM support_tickets WHERE user=? ORDER BY updated DESC',u.id));if(req.method==='POST'){rate('support:'+u.id,15);required(str(b.subject).length>=4&&str(b.message,3000).length>=10,'اكتب موضوع الرسالة والتفاصيل');required(['account','registration','request','technical','other'].includes(b.category),'حدد نوع المساعدة');const n=Number(run('INSERT INTO support_tickets(user,subject,category,created,updated) VALUES(?,?,?,?,?)',u.id,str(b.subject),b.category,now(),now()).lastInsertRowid);run('INSERT INTO support_messages(ticket,actor,message,created) VALUES(?,?,?,?)',n,u.id,str(b.message,3000),now());notifyAdmins('طلب دعم جديد',n);audit(u.id,'support_created',n);return send({id:n})}}
    const ticketMatch=p.match(/^\/api\/support\/(\d+)$/);if(ticketMatch){const ticket=one('SELECT * FROM support_tickets WHERE id=?',id(ticketMatch[1]));required(ticket&&(u.role==='admin'||ticket.user===u.id),'الرسالة غير موجودة',404);if(req.method==='GET')return send({...ticket,messages:all('SELECT support_messages.*,users.name actor_name,users.role actor_role FROM support_messages LEFT JOIN users ON users.id=actor WHERE ticket=? ORDER BY support_messages.id',ticket.id)});if(req.method==='POST'){required(str(b.message,3000).length>=3,'اكتب الرد');const status=u.role==='admin'?(b.close===true?'closed':ticket.source==='guest'?'open':'waiting_user'):'waiting_admin';run('INSERT INTO support_messages(ticket,actor,message,created) VALUES(?,?,?,?)',ticket.id,u.id,str(b.message,3000),now());run('UPDATE support_tickets SET status=?,updated=? WHERE id=?',status,now(),ticket.id);if(u.role==='admin'&&ticket.user)run('INSERT INTO notices(user,title,created) VALUES(?,?,?)',ticket.user,'رد جديد على رسالة الدعم #'+ticket.id,now());else if(u.role!=='admin')notifyAdmins('رد جديد على طلب الدعم',ticket.id);audit(u.id,'support_reply',ticket.id);return send({ok:true})}}
    if (p === '/api/admin/audit' && req.method === 'GET') {
      admin();
      return send(all(
        'SELECT audit.*,users.name actor_name FROM audit LEFT JOIN users ON users.id=audit.actor ORDER BY audit.id DESC LIMIT 200'
      ))
    }
    if (p === '/api/admin/export' && req.method === 'GET') {
      admin();
      let rows = all("SELECT id,title,status,created,updated,company FROM cases WHERE status!='draft' AND deleted_at IS NULL");
      const cols = ['id', 'title', 'status', 'created', 'updated', 'company'];
      const cell = v => '"' + String(v ?? '').replace(/^[=+@\-]/, "'$&").replaceAll('"', '""') + '"';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="IMC_requests.csv"');
      audit(u.id, 'export', 'cases');
      return res.end('\ufeff' + [cols, ...rows.map(r => cols.map(k => r[k]))].map(r => r.map(cell).join(
        ',')).join('\r\n'))
    }
    fail('غير موجود', 404);
  } catch (e) {
    if (!e.status) console.error('Request error:', e.message);
    send({
      error: e.status ? e.message : 'تعذر تنفيذ الطلب. حاول مرة أخرى.'
    }, e.status || 500)
  }
});
if (process.env.NODE_ENV !== 'test') server.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(
  `IMC running at http://localhost:${PORT} (${DEMO?'local demonstration':'production'})`));
