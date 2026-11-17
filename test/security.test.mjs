import {
  test,
  after
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'imc-test-'));
const {
  server
} = await import('../server.mjs');
const {
  db,
  run,
  one,
  hash,
  now
} = await import('../db.mjs');
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => {
  server.close();
  db.close();
  fs.rmSync(process.env.DATA_DIR, {
    recursive: true,
    force: true
  })
});
const pw = 'Testing@IMC2026!';
for (const [n, status] of [
    [1, 'approved'],
    [2, 'approved'],
    [3, 'pending']
  ]) {
  run('INSERT INTO companies(id,name,status,updated) VALUES(?,?,?,?)', n, 'Test ' + n, status, now());
  run('INSERT INTO users(id,email,name,role,hash,verified,company) VALUES(?,?,?,?,?,?,?)', n,
    `f${n}@test.test`, 'Test', 'factory', hash(pw), 1, n);
  run('INSERT INTO factories(id,company,name,status) VALUES(?,?,?,?)', n, n, 'Plant ' + n, 'approved')
}
run('INSERT INTO users(id,email,name,role,hash,verified) VALUES(?,?,?,?,?,?)', 4, 'admin@test.test', 'Admin',
  'admin', hash(pw), 1);
async function call(p, {
  user,
  body,
  method = body ? 'POST' : 'GET',
  headers = {}
} = {}) {
  let h = {
    ...headers
  };
  if (user) {
    h.Cookie = user.cookie;
    h['X-CSRF-Token'] = user.csrf
  }
  if (body && !(body instanceof FormData)) h['Content-Type'] = 'application/json';
  const r = await fetch(base + p, {
    method,
    headers: h,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return {
    status: r.status,
    data,
    headers: r.headers
  }
}
async function login(n) {
  const r = await call('/api/login', {
    body: {
      email: n === 4 ? 'admin@test.test' : `f${n}@test.test`,
      password: pw
    }
  });
  assert.equal(r.status, 200);
  return {
    cookie: r.headers.get('set-cookie').split(';')[0],
    csrf: r.data.csrf
  }
}
const a = await login(1),
  b = await login(2),
  pending = await login(3),
  admin = await login(4);
const form = {
  factory: '1',
  kind: 'challenge',
  area: 'quality',
  symptom: 'variation',
  probe: 'batch',
  scope: 'line',
  goal: 'quality',
  frequency: 'weekly',
  impacts: ['quality'],
  consent: true
};
let caseId;
test('Authentication and role boundaries', async () => {
  assert.equal((await call('/api/cases')).status, 401);
  assert.equal((await call('/api/admin/registrations', {
    user: a
  })).status, 403);
  assert.equal((await call('/api/profile', {
    user: admin
  })).status, 403)
});
test('CSRF and cross-origin requests rejected', async () => {
  assert.equal((await call('/api/cases', {
    body: {
      form
    },
    headers: {
      Cookie: a.cookie
    }
  })).status, 403);
  assert.equal((await call('/api/cases', {
    user: a,
    body: {
      form
    },
    headers: {
      Origin: 'https://evil.test'
    }
  })).status, 403)
});
test('Approved factory submits a valid request', async () => {
  const r = await call('/api/cases', {
    user: a,
    body: {
      form,
      submit: true
    }
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'submitted');
  caseId = r.data.id
});
test('Company isolation on reads and comments', async () => {
  assert.equal((await call(`/api/cases/${caseId}`, {
    user: b
  })).status, 404);
  assert.equal((await call(`/api/cases/${caseId}/comment`, {
    user: b,
    body: {
      message: 'Unauthorized'
    }
  })).status, 404)
});
test('Foreign factory and pending organization blocked', async () => {
  assert.equal((await call('/api/cases', {
    user: a,
    body: {
      form: {
        ...form,
        factory: '2'
      },
      submit: true
    }
  })).status, 400);
  assert.equal((await call('/api/cases', {
    user: pending,
    body: {
      form: {
        ...form,
        factory: '3'
      },
      submit: true
    }
  })).status, 400)
});
test('Drafts private, optimistic concurrency enforced', async () => {
  let r = await call('/api/cases', {
    user: a,
    body: {
      form: {
        kind: 'idea'
      }
    }
  });
  const n = r.data.id;
  assert.ok(!(await call('/api/cases', {
    user: admin
  })).data.some(x => x.id === n));
  assert.equal((await call(`/api/cases/${n}`, {
    user: a,
    body: {
      form: {
        kind: 'idea'
      },
      version: 1
    }
  })).status, 200);
  assert.notEqual((await call(`/api/cases/${n}`, {
    user: a,
    body: {
      form: {
        kind: 'idea'
      },
      version: 1
    }
  })).status, 200)
});
test('Invalid state transitions rejected', async () => {
  assert.equal((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      version: 1,
      status: 'closed',
      message: 'Invalid'
    }
  })).status, 400)
});
test('Internal notes and assessment are excluded from factory APIs', async () => {
  assert.equal((await call(`/api/cases/${caseId}/comment`, {
    user: admin,
    body: {
      message: 'SECRET INTERNAL',
      internal: true
    }
  })).status, 200);
  assert.equal((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      version: 1,
      status: 'under_review',
      message: 'Review started',
      classification: 'INTERNAL CLASS'
    }
  })).status, 200);
  const r = (await call(`/api/cases/${caseId}`, {
    user: a
  })).data;
  assert.equal(r.assessment, undefined);
  assert.ok(!JSON.stringify(r).includes('SECRET INTERNAL'));
  const list = (await call('/api/cases', {
    user: a
  })).data;
  assert.ok(!JSON.stringify(list).includes('INTERNAL CLASS'))
});
test('Stale admin decision rejected', async () => {
  assert.notEqual((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      version: 1,
      status: 'assessment',
      message: 'Stale'
    }
  })).status, 200)
});
test('Request for information and factory reply return to review', async () => {
  assert.equal((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      version: 2,
      status: 'needs_info',
      message: 'Need photo'
    }
  })).status, 200);
  assert.equal((await call(`/api/cases/${caseId}/comment`, {
    user: a,
    body: {
      message: 'Here is clarification',
      internal: true
    }
  })).status, 200);
  const r = (await call(`/api/cases/${caseId}`, {
    user: a
  })).data;
  assert.equal(r.status, 'under_review');
  assert.ok(r.events.some(e => e.message === 'Here is clarification' && e.internal === 0))
});
test('Submitted request cannot be overwritten', async () => assert.equal((await call(`/api/cases/${caseId}`, {
  user: a,
  body: {
    form,
    version: 4
  }
})).status, 400));
test('Solved outcome requires evidence', async () => {
  assert.equal((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      version: 4,
      status: 'closed',
      message: 'Done',
      outcome: 'solved'
    }
  })).status, 400)
});
test('File validation, access isolation and non-public storage', async () => {
  let fd = new FormData();
  fd.set('file', new Blob(['<script>bad</script>']), 'bad.pdf');
  fd.set('kind', 'attachment');
  fd.set('case_id', String(caseId));
  assert.equal((await call('/api/upload', {
    user: a,
    body: fd
  })).status, 400);
  fd.set('file', new Blob(['%PDF-1.4\nTest fixture']), 'fixture.pdf');
  assert.equal((await call('/api/upload', {
    user: a,
    body: fd
  })).status, 200);
  const f = one('SELECT * FROM files LIMIT 1');
  assert.equal((await call(`/api/files/${f.id}`, {
    user: b
  })).status, 404);
  assert.equal((await call(`/api/files/${f.id}`, {
    user: a
  })).status, 200);
  assert.equal((await call('/data/uploads/' + f.stored)).status, 404)
});
test('Approvals cannot bypass required documents', async () => assert.equal((await call(
  '/api/admin/registrations/3', {
    user: admin,
    body: {
      status: 'approved',
      reason: 'Reviewed',
      checked: true
    }
  })).status, 400));
test('Hashed passwords and defensive HTTP headers', async () => {
  assert.ok(!one('SELECT hash FROM users WHERE id=1').hash.includes(pw));
  const r = await call('/');
  assert.ok(r.headers.get('content-security-policy').includes("object-src 'none'"));
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
});
test('Session logout invalidates cookie', async () => {
  assert.equal((await call('/api/logout', {
    user: b,
    body: {}
  })).status, 200);
  assert.equal((await call('/api/cases', {
    user: b
  })).status, 401)
});
const completePayload = {
  name: 'New applicant',
  phone: '01022222222',
  email: 'new@test.test',
  password: pw,
  company: {
    name: 'New organization',
    tax: '111222333',
    commercial: '120456',commercialType:'local',commercialOffice:'Cairo',
    kind: 'single',
    representative: 'delegate',
    address: 'Cairo headquarters',
    job: 'Plant manager',
    imcClient: 'yes',
    imcCode: 'IMC-12345',
    consent: true
  },
  factories: [{
    name: 'New plant',
    industrial: '12345/2025',
    gov: 'القاهرة',
    city: 'بدر',
    region: 'القاهرة الكبرى والقناة',
    sector: 'هندسية',
    subsector: 'مكونات',
    size: 'small',
    year: '2025',
    address: 'Plant street'
  }]
};

function enrollment(payload = completePayload, omit = '') {
  const fd = new FormData();
  fd.set('payload', JSON.stringify(payload));
  for (const kind of ['commercial', 'tax', 'authorization', 'industrial_0'])
    if (kind !== omit) fd.set(kind, new Blob(['%PDF-1.4\nSynthetic test']), 'test.pdf');
  return fd;
}
test('Basic registration and incomplete full registrations are blocked atomically', async () => {
  assert.equal((await call('/api/register', {
    body: {
      email: 'short@test.test',
      name: 'Only basic',
      phone: '01022222222',
      password: pw
    }
  })).status, 400);
  assert.equal((await call('/api/register-complete', {
    body: enrollment(completePayload, 'tax')
  })).status, 400);
  assert.equal(one('SELECT id FROM users WHERE email=?', completePayload.email), undefined);
  const bad = structuredClone(completePayload);
  bad.company.imcCode = '';
  assert.equal((await call('/api/register-complete', {
    body: enrollment(bad)
  })).status, 400)
});
test('Local registration defers email verification, then requires approval before a challenge', async () => {
  let r = await call('/api/register-complete', {
    body: enrollment()
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.verificationRequired,false);
  assert.equal(r.data.mailSent,false);
  r = await call('/api/login', {
    body: {
      email: completePayload.email,
      password: pw
    }
  });
  const fresh = {
      cookie: r.headers.get('set-cookie').split(';')[0],
      csrf: r.data.csrf
    },
    uid = r.data.user.id,
    company = r.data.user.company;
  assert.equal(JSON.parse(one('SELECT data FROM companies WHERE id=?', company).data).imcCode,
    'IMC-12345');
  assert.equal((await call('/api/registration/submit', {
    user: fresh,
    body: {}
  })).status, 400);
  assert.equal(one('SELECT status FROM companies WHERE id=?', company).status,'pending');
  assert.equal(one('SELECT verified FROM users WHERE id=?',uid).verified,0);
  assert.equal(one('SELECT count(*) n FROM mail WHERE user=?',uid).n,0);
  assert.equal((await call('/api/cases',{user:fresh,body:{form,submit:true}})).status,400);
  assert.equal((await call(`/api/admin/registrations/${company}`, {
    user: admin,
    body: {
      status: 'approved',
      reason: 'Reviewed complete file',
      checked: true
    }
  })).status, 200);
  const plant = one('SELECT id FROM factories WHERE company=?', company).id;
  assert.equal((await call('/api/cases', {
    user: fresh,
    body: {
      form: {
        ...form,
        factory: String(plant)
      },
      submit: true
    }
  })).status, 200)
});
test('Partner directory starts empty, rejects fake assignment and wrong category', async () => {
  assert.equal((await call('/api/admin/partners', {
    user: admin
  })).data.length, 0);
  assert.equal((await call('/api/admin/partners', {
    user: a
  })).status, 403);
  let c = one('SELECT * FROM cases WHERE id=?', caseId);
  assert.equal((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      status: 'assessed',
      version: c.version,
      message: 'Assessment complete'
    }
  })).status, 200);
  c = one('SELECT * FROM cases WHERE id=?', caseId);
  assert.equal((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      status: 'assigned',
      version: c.version,
      partner: 999,
      message: 'Assign'
    }
  })).status, 400);
  assert.equal((await call('/api/admin/partners', {
    user: admin,
    body: {
      kind: 'program',
      name: 'Synthetic program'
    }
  })).status, 200);
  const program = one('SELECT id FROM partners WHERE kind=?', 'program').id;
  assert.equal((await call(`/api/cases/${caseId}/review`, {
    user: admin,
    body: {
      status: 'assigned',
      version: c.version,
      partner: program,
      message: 'Wrong type'
    }
  })).status, 400)
});
test('Assignment, execution and evidence-based resolution preserve private assessment', async () => {
  assert.equal((await call('/api/admin/partners', {
    user: admin,
    body: {
      kind: 'university',
      name: 'Synthetic university'
    }
  })).status, 200);
  const partner = one('SELECT id FROM partners WHERE kind=?', 'university').id;
  for (const status of ['assigned', 'in_progress', 'solved']) {
    const c = one('SELECT * FROM cases WHERE id=?', caseId);
    const r = await call(`/api/cases/${caseId}/review`, {
      user: admin,
      body: {
        status,
        version: c.version,
        partner,
        message: 'Public progress update',
        executionNote: 'Public implementation update',
        owner: 'Private staff member',
        evidence: status === 'solved' ? 'Documented result and verification evidence' : ''
      }
    });
    assert.equal(r.status, 200, JSON.stringify(r.data))
  }
  const detail = (await call(`/api/cases/${caseId}`, {
    user: a
  })).data;
  assert.equal(detail.workflow.partner, 'Synthetic university');
  assert.ok(detail.workflow.evidence.includes('Documented'));
  assert.ok(!JSON.stringify(detail).includes('Private staff member'));
  assert.equal(detail.status, 'solved')
});
test('Early closure is a separate explained outcome', async () => {
  let r = await call('/api/cases', {
    user: a,
    body: {
      form,
      submit: true
    }
  });
  const n = r.data.id;
  assert.equal((await call(`/api/cases/${n}/review`, {
    user: admin,
    body: {
      status: 'closed',
      version: 1,
      message: 'Outside scope',
      outcome: 'not_eligible'
    }
  })).status, 200);
  assert.equal((await call(`/api/cases/${n}`, {
    user: a
  })).data.status, 'closed')
});
test('Excel export is an authorized XLSX archive with company and factory sheets', async () => {
  assert.equal((await call('/api/admin/registrations-export', {
    user: a
  })).status, 403);
  const response = await fetch(base + '/api/admin/registrations-export', {
    headers: {
      Cookie: admin.cookie
    }
  });
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('content-type').includes('spreadsheetml'));
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.ok(bytes.includes(Buffer.from('IMC-12345')));
  assert.ok(bytes.includes(Buffer.from('sheet2.xml')));
  assert.ok(!bytes.includes(Buffer.from(pw)));
  fs.writeFileSync(process.env.DATA_DIR+'/registration-export-qa.xlsx', bytes)
});
test('Admin cannot inspect unpublished draft by guessing its id', async () => {
  const draft = one("SELECT id FROM cases WHERE status='draft'");
  assert.equal((await call(`/api/cases/${draft.id}`, {
    user: admin
  })).status, 404)
});
test('Shared validation checks email, full name, job, mobile and registry formats',()=>{const V=globalThis.IMCValidation;for(const email of ['wrong','one@','name@domain','a..b@example.com','a@-domain.com','a@example..com'])assert.equal(V.email(email),false,email);assert.equal(V.email('name+factory@example.com'),true);assert.equal(V.fullName('Abanoub'),false);assert.equal(V.fullName('Ahmed 123'),false);assert.equal(V.fullName('احمد محمود'),true);assert.equal(V.job('12345'),false);assert.equal(V.job('مدير المصنع'),true);assert.equal(V.mobile('01112345678'),'01112345678');assert.equal(V.mobile('+20 111 234 5678'),'01112345678');assert.equal(V.mobile('012345'),null);assert.equal(V.mobile('01912345678'),null);assert.equal(V.commercial('12345','local','Cairo'),true);assert.equal(V.commercial('12345','local',''),false);assert.equal(V.commercial('123456789012345','unified'),true);assert.equal(V.commercial('12345','unified'),false);assert.equal(V.industrial('12345/2025'),true);assert.equal(V.industrial('ABCDE'),false)});
test('Legal representatives require proof of capacity before any account is created',async()=>{const payload=structuredClone(completePayload);payload.email='legal@test.test';payload.company.tax='333444555';payload.company.commercial='334456';payload.company.representative='legal';assert.equal((await call('/api/register-complete',{body:enrollment(payload,'authorization')})).status,400);assert.equal(one('SELECT id FROM users WHERE email=?',payload.email),undefined)});
test('Information request records requirements and a plant response with ownership checks',async()=>{const r=await call('/api/cases',{user:a,body:{form,submit:true}});const n=r.data.id;assert.equal((await call(`/api/cases/${n}/review`,{user:admin,body:{version:1,status:'needs_info',message:'Please provide the operating temperature',requestedFields:'Temperature and operating duration',requestedDocuments:'Machine photo',infoDue:'2026-12-01'}})).status,200);let c=(await call(`/api/cases/${n}`,{user:a})).data;assert.equal(c.informationRequests[0].fields,'Temperature and operating duration');const request=c.informationRequests[0].id;assert.equal((await call(`/api/cases/${n}/answer`,{user:pending,body:{request,message:'Wrong owner'}})).status,404);assert.equal((await call(`/api/cases/${n}/answer`,{user:a,body:{request,message:'Operating temperature is 45 C for two hours'}})).status,200);c=(await call(`/api/cases/${n}`,{user:a})).data;assert.equal(c.status,'under_review');assert.equal(c.informationRequests[0].status,'answered');assert.equal(c.informationRequests[0].answers.length,1)});
test('Project updates are visible to the owner and validate progress',async()=>{let c=one('SELECT * FROM cases WHERE id=?',caseId);const r=await call(`/api/cases/${caseId}/review`,{user:admin,body:{version:c.version,status:'solved',outcome:'solved',evidence:'Verified solution with documented evidence',message:'Project review update',phase:'handover',progress:100,projectNote:'The research organization completed the first study phase'}});assert.equal(r.status,200,JSON.stringify(r.data));const view=(await call(`/api/cases/${caseId}`,{user:a})).data;assert.equal(view.projectUpdates[0].progress,100);c=one('SELECT * FROM cases WHERE id=?',caseId);assert.equal((await call(`/api/cases/${caseId}/review`,{user:admin,body:{version:c.version,message:'Bad update',phase:'testing',progress:101,projectNote:'Invalid progress value'}})).status,400)});
test('Support messages reach admins, preserve owner isolation and return replies',async()=>{let r=await call('/api/support',{user:a,body:{subject:'Registration help',category:'registration',message:'Please help clarify the required documents for my plant'}});assert.equal(r.status,200);const n=r.data.id;assert.ok((await call('/api/support',{user:admin})).data.some(t=>t.id===n));assert.equal((await call('/api/support/'+n,{user:pending})).status,404);assert.equal((await call('/api/support/'+n,{user:admin,body:{message:'Please upload the industrial register for the new plant'}})).status,200);r=await call('/api/support/'+n,{user:a});assert.equal(r.data.messages.length,2);assert.equal(r.data.status,'waiting_user');assert.ok((await call('/api/notices',{user:a})).data.some(t=>t.title.includes('#'+n)))});
test('Activity filters and actionable queues are admin-only',async()=>{assert.equal((await call('/api/actions',{user:a})).status,403);assert.equal((await call('/api/tasks',{user:a})).status,403);const events=(await call('/api/actions?action=support_reply&from=2020-01-01&to=2099-12-31',{user:admin})).data;assert.ok(events.length);assert.ok(events.every(e=>e.action==='support_reply'));assert.equal((await call('/api/actions?from=invalid',{user:admin})).status,400);assert.equal((await call('/api/tasks',{user:admin})).data.support.length,0)});
test('Approval needs no manually entered reason, but incomplete and rejected decisions do',async()=>{const company=Number(run("INSERT INTO companies(name,status,representative,updated) VALUES(?,?,?,?)",'Approval fixture','pending','owner',now()).lastInsertRowid);run('INSERT INTO users(email,name,role,hash,verified,company) VALUES(?,?,?,?,?,?)','approval@test.test','Approval Person','factory',hash(pw),1,company);const plant=Number(run('INSERT INTO factories(company,name) VALUES(?,?)',company,'Approval plant').lastInsertRowid);for(const kind of ['commercial','tax','industrial'])run('INSERT INTO files(company,factory,kind) VALUES(?,?,?)',company,kind==='industrial'?plant:null,kind);assert.equal((await call('/api/admin/registrations/'+company,{user:admin,body:{status:'needs_info'}})).status,400);assert.equal((await call('/api/admin/registrations/'+company,{user:admin,body:{status:'approved',checked:true}})).status,200)});
test('An approved company can add a plant without losing existing approvals',async()=>{const r=await call('/api/factories',{user:a,body:{name:'Additional industrial plant',gov:'القاهرة',city:'بدر',region:'القاهرة الكبرى والقناة',sector:'الصناعات الهندسية',size:'medium',industrial:'١٢٣٤٥/٢٠٢٦',subsector:'معدات وآلات',year:'2025',address:'Industrial zone'}});assert.equal(r.status,200,JSON.stringify(r.data));const profile=(await call('/api/profile',{user:a})).data;assert.equal(profile.company.status,'approved');assert.equal(profile.company.kind,'multi');assert.equal(profile.factories.filter(f=>f.status==='approved').length,1);const pendingPlant=profile.factories.find(f=>f.name==='Additional industrial plant');assert.equal(pendingPlant.status,'pending');assert.equal(pendingPlant.industrial,'12345/2026');assert.ok((await call('/api/tasks',{user:admin})).data.plants.some(f=>f.id===pendingPlant.id));});
test('Sign out also clears stale cookies after a session has expired',async()=>{const r=await call('/api/logout',{body:{}});assert.equal(r.status,200);const logout=await fetch(base+'/api/logout',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'imc=expired-test-session'},body:'{}'});assert.equal(logout.status,200);assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'))});
test('Empty drafts are rejected and meaningful private drafts create no notices or events',async()=>{const count=one('SELECT COUNT(*) n FROM cases').n,notices=one('SELECT COUNT(*) n FROM notices').n;assert.equal((await call('/api/cases',{user:a,body:{form:{factory:'1',step:1}}})).status,400);assert.equal(one('SELECT COUNT(*) n FROM cases').n,count);const r=await call('/api/cases',{user:a,body:{form:{factory:'1',kind:'lab'}}});assert.equal(r.status,200);assert.equal(one('SELECT COUNT(*) n FROM notices').n,notices);assert.equal(one('SELECT COUNT(*) n FROM events WHERE case_id=?',r.data.id).n,0);assert.equal((await call('/api/cases/'+r.data.id,{user:a,body:{version:r.data.version,form:{factory:'1',kind:'lab',labGoal:'composition'}}})).status,200);assert.equal(one('SELECT COUNT(*) n FROM notices').n,notices)});
test('Admin request list includes selected factory and organization names for search',async()=>{const list=(await call('/api/cases',{user:admin})).data;const c=list.find(r=>r.id===caseId);assert.equal(c.company_name,'Test 1');assert.equal(c.factory_names,'Plant 1');assert.ok(!list.some(r=>r.status==='draft'))});
test('Admin date filters include Cairo midnight boundaries and reject reversed periods',async()=>{run('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)',4,'cairo_boundary','boundary-before','2026-11-16T21:59:59Z');run('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)',4,'cairo_boundary','boundary-inside','2026-11-16T22:00:00Z');run('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)',4,'cairo_boundary','boundary-after','2026-11-17T22:00:00Z');const r=await call('/api/actions?action=cairo_boundary&from=2026-11-17&to=2026-11-17',{user:admin});assert.equal(r.status,200);assert.deepEqual(r.data.map(r=>r.target),['boundary-inside']);assert.equal((await call('/api/actions?from=2026-11-18&to=2026-11-17',{user:admin})).status,400);assert.equal((await call('/api/actions?from=2026-02-30',{user:admin})).status,400)});
test('Approved organizations without pending plants reject repeat approval',async()=>{assert.equal((await call('/api/admin/registrations/2',{user:admin,body:{status:'approved',checked:true}})).status,400);run('INSERT INTO companies(name,status,updated) VALUES(?,?,?)','Unsubmitted fixture','draft',now());const list=(await call('/api/admin/registrations',{user:admin})).data;assert.ok(list.every(c=>c.status!=='draft'));assert.ok(list.find(c=>c.id===1).factory_names.includes('Plant 1'))});
test('Factory locations persist and reject district or industrial-zone mismatches',async()=>{const location=globalThis.IMCLocations['القاهرة'],plant={name:'Location fixture plant',gov:'القاهرة',city:'بدر',districtChoice:'بدر',locationType:'industrial',zoneChoice:location.zones[0],industrialZone:location.zones[0],region:'القاهرة الكبرى والقناة',sector:'هندسية',size:'small',industrial:'90123',subsector:'معدات',year:'2025',address:'Test industrial road'};assert.equal((await call('/api/factories',{user:a,body:{...plant,gov:'Unknown governorate'}})).status,400);let r=await call('/api/factories',{user:a,body:{...plant,city:'مركز إسنا'}});assert.equal(r.status,400);r=await call('/api/factories',{user:a,body:{...plant,industrialZone:globalThis.IMCLocations['الجيزة'].zones[0]}});assert.equal(r.status,400);r=await call('/api/factories',{user:a,body:{...plant,region:'Wrong region'}});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(one('SELECT region FROM factories WHERE name=?',plant.name).region,'القاهرة الكبرى والقناة');const saved=one('SELECT data FROM factories WHERE name=?',plant.name);assert.equal(JSON.parse(saved.data).industrialZone,location.zones[0]);r=await call('/api/factories',{user:a,body:{...plant,name:'Other location fixture',city:'مركز اختباري',districtChoice:'other',industrialZone:'منطقة صناعية اخرى للاختبار',zoneChoice:'other'}});assert.equal(r.status,200,JSON.stringify(r.data))});
test('Server accepts a numeric eight-character password and rejects seven characters',async()=>{const user=await login(2);assert.equal((await call('/api/password',{user,body:{current:pw,password:'1234567'}})).status,400);assert.equal((await call('/api/password',{user,body:{current:pw,password:'12345678'}})).status,200);assert.equal((await call('/api/login',{body:{email:'f2@test.test',password:'12345678'}})).status,200)});
test('Public contact creates a private guest ticket and admin follow-up without fake delivery',async()=>{const payload={name:'زائر المنصة',email:'guest@example.test',phone:'01012345678',subject:'استفسار عن المنصة',message:'اريد معرفة المستندات المطلوبة لتسجيل المصنع',website:''};let r=await call('/api/contact',{body:payload});assert.equal(r.status,201,JSON.stringify(r.data));assert.match(r.data.reference,/^CNT-[A-F0-9]{12}$/);assert.equal(r.data.id,undefined);const ticket=one('SELECT * FROM support_tickets WHERE public_reference=?',r.data.reference);assert.equal(ticket.source,'guest');assert.equal(ticket.user,null);assert.equal(ticket.guest_phone,'01012345678');assert.equal((await call('/api/support/'+ticket.id)).status,401);assert.equal((await call('/api/support/'+ticket.id,{user:a})).status,404);assert.ok(!(await call('/api/support',{user:a})).data.some(t=>t.id===ticket.id));const list=(await call('/api/support',{user:admin})).data;assert.equal(list.find(t=>t.id===ticket.id).applicant,payload.name);const detail=(await call('/api/support/'+ticket.id,{user:admin})).data;assert.equal(detail.messages.length,1);assert.equal(detail.messages[0].message,payload.message);assert.equal((await call('/api/support/'+ticket.id,{user:admin,body:{message:'تم التواصل هاتفيا وجار المتابعة'}})).status,200);assert.equal(one('SELECT status FROM support_tickets WHERE id=?',ticket.id).status,'open');assert.equal(one('SELECT COUNT(*) n FROM notices WHERE user IS NULL').n,0);assert.equal((await call('/api/support/'+ticket.id,{user:admin,body:{message:'تمت الاجابة على الاستفسار',close:true}})).status,200);assert.equal(one('SELECT status FROM support_tickets WHERE id=?',ticket.id).status,'closed');assert.equal((await call('/api/contact',{body:{...payload,email:'invalid',phone:'abc'}})).status,400);assert.equal((await call('/api/contact',{body:{...payload,website:'spam.test'}})).status,400);assert.equal((await call('/api/contact',{body:{...payload,message:'short'}})).status,400);assert.equal((await call('/api/contact',{body:payload,headers:{Origin:'https://evil.test'}})).status,403);assert.equal((await call('/api/contact',{body:payload})).status,201);assert.equal((await call('/api/contact',{body:payload})).status,429)});
test('Only private drafts can enter trash and restoration remains owner scoped',async()=>{
 const c=(await call('/api/cases',{user:a,body:{form:{factory:'1',kind:'lab'}}})).data;
 assert.equal((await call('/api/cases/'+c.id,{user:pending,method:'DELETE',body:{confirm:true,version:c.version}})).status,404);
 assert.equal((await call('/api/cases/'+c.id,{user:admin,method:'DELETE',body:{confirm:true,version:c.version}})).status,404);
 assert.equal((await call('/api/cases/'+c.id,{user:a,method:'DELETE',body:{version:c.version}})).status,400);
 assert.equal((await call('/api/cases/'+c.id,{user:a,method:'DELETE',body:{confirm:true,version:9999}})).status,409);
 assert.equal((await call('/api/cases/'+c.id,{user:a,method:'DELETE',body:{confirm:true,version:c.version}})).status,200);
 assert.equal((await call('/api/cases/'+c.id,{user:a})).status,404);
 const deleted=(await call('/api/cases?deleted=1',{user:a})).data.find(t=>t.id===c.id);assert.ok(deleted.deleted_at);
 assert.equal((await call('/api/cases/'+c.id+'/restore',{user:pending,body:{version:deleted.version}})).status,404);
 assert.equal((await call('/api/cases/'+c.id+'/restore',{user:a,body:{version:c.version}})).status,409);
 assert.equal((await call('/api/cases/'+c.id+'/restore',{user:a,body:{version:deleted.version}})).status,200);
 assert.equal((await call('/api/cases/'+c.id,{user:admin})).status,404);
 assert.equal(one('SELECT deleted_at FROM cases WHERE id=?',c.id).deleted_at,null);
});
test('A private draft can be deleted and restored without admin notifications',async()=>{const c=(await call('/api/cases',{user:a,body:{form:{factory:'1',kind:'lab'}}})).data;const before=one('SELECT COUNT(*) n FROM notices WHERE user=4').n;assert.equal((await call('/api/cases/'+c.id,{user:a,method:'DELETE',body:{confirm:true,version:c.version}})).status,200);assert.equal((await call('/api/cases/'+c.id+'/restore',{user:a,body:{version:c.version+1}})).status,200);assert.equal(one('SELECT COUNT(*) n FROM notices WHERE user=4').n,before);assert.equal((await call('/api/cases/'+c.id,{user:admin})).status,404)});
test('An information response and its files commit together and remain linked to that response',async()=>{const c=(await call('/api/cases',{user:a,body:{form,submit:true}})).data;await call('/api/cases/'+c.id+'/review',{user:admin,body:{version:c.version,status:'needs_info',message:'ارسل صورة الماكينة مع قياسات التشغيل',requestedDocuments:'صورة الماكينة'}});const request=one('SELECT id FROM info_requests WHERE case_id=?',c.id).id;const fd=new FormData();fd.set('request',String(request));fd.set('message','درجة التشغيل 45 ووقت التشغيل ساعتان');fd.append('attachments',new Blob(['not a pdf']),'wrong.pdf');const filesBefore=one('SELECT COUNT(*) n FROM files').n;assert.equal((await call('/api/cases/'+c.id+'/answer',{user:a,body:fd})).status,400);assert.equal(one('SELECT COUNT(*) n FROM info_answers WHERE request=?',request).n,0);assert.equal(one('SELECT COUNT(*) n FROM files').n,filesBefore);fd.set('attachments',new Blob(['%PDF-1.4\nFactory operating figures']),'operating.pdf');assert.equal((await call('/api/cases/'+c.id+'/answer',{user:pending,body:fd})).status,404);let r=await call('/api/cases/'+c.id+'/answer',{user:a,body:fd});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.attachments,1);const detail=(await call('/api/cases/'+c.id,{user:a})).data;assert.equal(detail.status,'under_review');const answer=detail.informationRequests[0].answers[0];assert.equal(answer.files.length,1);assert.equal(answer.files[0].name,'operating.pdf');assert.equal(detail.files[0].info_answer,answer.id);assert.equal(detail.files[0].uploaded_by_name,'Test');const view=(await call('/api/cases/'+c.id,{user:admin})).data;assert.equal(view.informationRequests[0].answers[0].files[0].id,answer.files[0].id);assert.equal((await call('/api/files/'+answer.files[0].id,{user:pending})).status,404);assert.equal((await call('/api/cases/'+c.id+'/answer',{user:a,body:fd})).status,400)});
test('Sent request attachments remain protected against factory deletion',async()=>{const c=(await call('/api/cases',{user:a,body:{form,submit:true}})).data;const fd=new FormData();fd.append('attachments',new Blob(['%PDF-1.4\nGeneral attachment']),'first.pdf');fd.append('attachments',new Blob(['bad image']),'bad.png');let r=await call('/api/cases/'+c.id+'/attachments',{user:a,body:fd});assert.equal(r.status,400);assert.equal(one('SELECT COUNT(*) n FROM files WHERE case_id=?',c.id).n,0);fd.delete('attachments');for(let i=0;i<6;i++)fd.append('attachments',new Blob(['%PDF-1.4\nTest']),'file'+i+'.pdf');assert.equal((await call('/api/cases/'+c.id+'/attachments',{user:a,body:fd})).status,400);fd.delete('attachments');fd.append('attachments',new Blob(['%PDF-1.4\nGeneral attachment']),'process.pdf');r=await call('/api/cases/'+c.id+'/attachments',{user:a,body:fd});assert.equal(r.status,200,JSON.stringify(r.data));let detail=(await call('/api/cases/'+c.id,{user:a})).data;assert.equal(detail.files.length,1);assert.equal(detail.files[0].info_answer,null);assert.ok(detail.events.some(e=>e.kind==='attachments'));assert.equal((await call('/api/cases/'+c.id,{user:a,method:'DELETE',body:{confirm:true,version:detail.version}})).status,400);assert.equal((await call('/api/files/'+detail.files[0].id,{user:a})).status,200);assert.equal((await call('/api/cases/'+c.id+'/attachments',{user:a,body:fd})).status,200)});
test('Focused review updates preserve the existing technical assessment',async()=>{const c=(await call('/api/cases',{user:a,body:{form,submit:true}})).data;let r=await call('/api/cases/'+c.id+'/review',{user:admin,body:{version:c.version,status:'under_review',message:'بدء مراجعة الطلب',classification:'التصنيف الفني المحفوظ',priority:'high',suitability:'potential'}});assert.equal(r.status,200);let detail=(await call('/api/cases/'+c.id,{user:admin})).data;r=await call('/api/cases/'+c.id+'/review',{user:admin,body:{version:detail.version,status:'needs_info',message:'ارسل قياسات اضافية'}});assert.equal(r.status,200);detail=(await call('/api/cases/'+c.id,{user:admin})).data;assert.equal(detail.assessment.classification,'التصنيف الفني المحفوظ');assert.equal(detail.assessment.priority,'high');assert.equal(detail.assessment.suitability,'potential')});
test('Other industry requires both sector and subsector and persists the custom choice',async()=>{const plant={name:'Custom industry fixture',gov:'القاهرة',city:'بدر',region:'القاهرة الكبرى والقناة',sectorChoice:'other',sector:'تصنيع تخصصي',subsector:'مكونات خاصة',size:'small',industrial:'90127',year:'2025',address:'Industrial road'};assert.equal((await call('/api/factories',{user:a,body:{...plant,subsector:'أخرى'}})).status,400);assert.equal((await call('/api/factories',{user:a,body:plant})).status,200);const saved=one('SELECT sector,data FROM factories WHERE name=?',plant.name);assert.equal(saved.sector,plant.sector);assert.equal(JSON.parse(saved.data).sectorChoice,'other');assert.equal(JSON.parse(saved.data).subsector,plant.subsector)});
test('Legacy information requests accept an attached response without losing old history',async()=>{const c=(await call('/api/cases',{user:a,body:{form,submit:true}})).data;run("UPDATE cases SET status='needs_info' WHERE id=?",c.id);run('INSERT INTO events(case_id,company,actor,kind,message,created) VALUES(?,?,?,?,?,?)',c.id,1,4,'needs_info','Legacy question',now());const fd=new FormData();fd.set('request','0');fd.set('message','Legacy response with supporting data');fd.append('attachments',new Blob(['%PDF-1.4\nLegacy response']),'legacy.pdf');const response=await call('/api/cases/'+c.id+'/answer',{user:a,body:fd});assert.equal(response.status,200,JSON.stringify(response.data));const detail=(await call('/api/cases/'+c.id,{user:a})).data;assert.equal(detail.informationRequests[0].question,'Legacy question');assert.equal(detail.informationRequests[0].answers[0].files.length,1);assert.ok(detail.events.some(e=>e.message==='Legacy question'))});
test('Registration needs-info remains distinct until resubmission, with decision and actor history',async()=>{
 const payload=structuredClone(completePayload);payload.email='history@test.test';payload.company.tax='444555666';payload.company.commercial='987654';payload.company.name='History organization';
 assert.equal((await call('/api/register-complete',{body:enrollment(payload)})).status,200);
 let r=await call('/api/login',{body:{email:payload.email,password:pw}});const user={cookie:r.headers.get('set-cookie').split(';')[0],csrf:r.data.csrf},company=r.data.user.company;
 const reason='Please replace the unclear commercial register scan';
 assert.equal((await call('/api/admin/registrations/'+company,{user:admin,body:{status:'needs_info',reason}})).status,200);
 assert.equal((await call('/api/admin/registrations',{user:admin})).data.find(c=>c.id===company).status,'needs_info');
 let detail=(await call('/api/admin/registrations/'+company,{user:admin})).data;
 assert.equal(detail.history[0].message,reason);assert.equal(detail.history[0].actor_name,'Admin');assert.equal(detail.history[0].from_status,'pending');assert.equal(detail.history[0].to_status,'needs_info');assert.ok(detail.history[0].created);
 assert.equal((await call('/api/admin/registrations/'+company,{user:a})).status,403);
 assert.equal((await call('/api/registration/submit',{user,body:{}})).status,200);
 detail=(await call('/api/admin/registrations/'+company,{user:admin})).data;
 assert.equal(detail.company.status,'pending');assert.equal(detail.history[0].action,'registration_submitted');assert.equal(detail.history[0].from_status,'needs_info');assert.equal(detail.history[1].message,reason);
});
test('Sent requests require a tracked closure request and centre approval; closed history cannot be deleted',async()=>{
 const c=(await call('/api/cases',{user:a,body:{form,submit:true}})).data;
 const notices=one('SELECT COUNT(*) n FROM notices WHERE user=4').n;
 assert.equal((await call('/api/cases/'+c.id,{user:a,method:'DELETE',body:{confirm:true,version:c.version}})).status,400);
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:pending,body:{version:c.version,message:'Please close this request'}})).status,404);
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:admin,body:{version:c.version,message:'Please close this request'}})).status,403);
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:a,body:{version:c.version,message:'short'}})).status,400);
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:a,body:{version:9999,message:'Please close this request'}})).status,409);
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:a,body:{version:c.version,message:'Please close this duplicate request'}})).status,200);
 let d=(await call('/api/cases/'+c.id,{user:a})).data;assert.equal(d.status,'submitted');assert.equal(d.closureRequests[0].status,'pending');assert.equal(one('SELECT COUNT(*) n FROM notices WHERE user=4').n,notices+1);
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:a,body:{version:d.version,message:'Another closure request'}})).status,409);
 assert.ok((await call('/api/tasks',{user:admin})).data.requests.find(t=>t.id===c.id).closure_pending);
 const body={request:d.closureRequests[0].id,version:d.version,decision:'approved',message:'Closed following the factory request'};
 assert.equal((await call('/api/cases/'+c.id+'/closuredecision',{user:a,body})).status,403);
 assert.equal((await call('/api/cases/'+c.id+'/closuredecision',{user:admin,body:{...body,version:9999}})).status,409);
 assert.equal((await call('/api/cases/'+c.id+'/closuredecision',{user:admin,body})).status,200);
 d=(await call('/api/cases/'+c.id,{user:a})).data;assert.equal(d.status,'closed');assert.equal(d.workflow.outcome,'withdrawn');assert.equal(d.closureRequests[0].status,'approved');assert.equal(d.closureRequests[0].reviewer_name,'Admin');assert.ok(d.events.some(e=>e.kind==='closure_requested'));assert.ok(d.events.some(e=>e.kind==='closed'));
 for(const [suffix,method]of [['','DELETE'],['/purge','DELETE'],['/restore','POST'],['/closure','POST']])assert.equal((await call('/api/cases/'+c.id+suffix,{user:a,method,body:{confirm:true,version:d.version,message:'Try to remove closed history'}})).status,400);
 assert.ok((await call('/api/cases',{user:a})).data.some(t=>t.id===c.id));assert.ok(!(await call('/api/cases?deleted=1',{user:a})).data.some(t=>t.id===c.id));
});
test('Rejected closure keeps an in-progress request active and allows a later request',async()=>{
 const c=(await call('/api/cases',{user:a,body:{form,submit:true}})).data;run("UPDATE cases SET status='in_progress' WHERE id=?",c.id);
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:a,body:{version:c.version,message:'Please close the research request'}})).status,200);
 assert.ok((await call('/api/tasks',{user:admin})).data.requests.find(t=>t.id===c.id).closure_pending);
 let d=(await call('/api/cases/'+c.id,{user:admin})).data;
 assert.equal((await call('/api/cases/'+c.id+'/closuredecision',{user:admin,body:{request:d.closureRequests[0].id,version:d.version,decision:'rejected',message:'Continue the agreed research work'}})).status,200);
 d=(await call('/api/cases/'+c.id,{user:a})).data;assert.equal(d.status,'in_progress');assert.equal(d.closureRequests[0].status,'rejected');assert.equal(d.closureRequests[0].reply,'Continue the agreed research work');
 assert.equal((await call('/api/cases/'+c.id+'/closure',{user:a,body:{version:d.version,message:'Please reconsider due to shutdown'}})).status,200);
 d=(await call('/api/cases/'+c.id,{user:a})).data;
 assert.equal((await call('/api/cases/'+c.id+'/review',{user:admin,body:{version:d.version,status:'closed',outcome:'withdrawn',message:'Closed after the factory shutdown'}})).status,200);
 d=(await call('/api/cases/'+c.id,{user:a})).data;assert.equal(d.closureRequests[0].status,'approved');assert.equal(d.closureRequests.length,2);
});
test('Solved requests remain visible and reject closure, soft deletion and permanent deletion',async()=>{
 const d=(await call('/api/cases/'+caseId,{user:a})).data;assert.equal(d.status,'solved');
 for(const [suffix,method]of [['','DELETE'],['/purge','DELETE'],['/closure','POST']])assert.equal((await call('/api/cases/'+caseId+suffix,{user:a,method,body:{confirm:true,version:d.version,message:'Please delete this solved request'}})).status,400);
 assert.ok((await call('/api/cases',{user:a})).data.some(c=>c.id===caseId&&c.status==='solved'));
});
test('Permanent deletion requires a trashed owned draft and removes its files, records and physical bytes',async()=>{
 const c=(await call('/api/cases',{user:a,body:{form:{factory:'1',kind:'lab'}}})).data;
 const fd=new FormData();fd.append('attachments',new Blob(['%PDF-1.4\nPrivate draft attachment']),'draft.pdf');
 assert.equal((await call('/api/cases/'+c.id+'/attachments',{user:a,body:fd})).status,200);
 let d=one('SELECT * FROM cases WHERE id=?',c.id);const f=one('SELECT * FROM files WHERE case_id=?',c.id),physical=path.join(process.env.DATA_DIR,'uploads',f.stored);assert.ok(fs.existsSync(physical));
 const notices=one('SELECT COUNT(*) n FROM notices WHERE user=4').n;
 assert.equal((await call('/api/cases/'+c.id+'/purge',{user:a,method:'DELETE',body:{confirm:true,version:d.version}})).status,400);
 assert.equal((await call('/api/cases/'+c.id,{user:a,method:'DELETE',body:{confirm:true,version:d.version}})).status,200);d=one('SELECT * FROM cases WHERE id=?',c.id);
 assert.equal((await call('/api/cases/'+c.id+'/purge',{user:pending,method:'DELETE',body:{confirm:true,version:d.version}})).status,404);
 assert.equal((await call('/api/cases/'+c.id+'/purge',{user:admin,method:'DELETE',body:{confirm:true,version:d.version}})).status,404);
 assert.equal((await call('/api/cases/'+c.id+'/purge',{user:a,method:'DELETE',body:{version:d.version}})).status,400);
 assert.equal((await call('/api/cases/'+c.id+'/purge',{user:a,method:'DELETE',body:{confirm:true,version:d.version-1}})).status,409);
 assert.equal((await call('/api/cases/'+c.id+'/purge',{user:a,method:'DELETE',body:{confirm:true,version:d.version}})).status,200);
 assert.equal(one('SELECT * FROM cases WHERE id=?',c.id),undefined);assert.equal(one('SELECT * FROM files WHERE case_id=?',c.id),undefined);assert.equal(one('SELECT * FROM events WHERE case_id=?',c.id),undefined);assert.equal(fs.existsSync(physical),false);assert.equal(one('SELECT COUNT(*) n FROM notices WHERE user=4').n,notices);assert.ok(one("SELECT id FROM audit WHERE target=? AND action='draft_purged'",String(c.id)));
 assert.equal((await call('/api/cases/'+c.id+'/restore',{user:a,body:{version:d.version}})).status,404);
});

test('Registration decisions roll back if their history cannot be recorded',async()=>{
 const company=Number(run("INSERT INTO companies(name,status,updated) VALUES('Atomic review','pending',?)",now()).lastInsertRowid);const before=one('SELECT COUNT(*) n FROM notices').n;
 db.exec(`CREATE TRIGGER registration_history_failure BEFORE INSERT ON registration_history WHEN NEW.company=${company} BEGIN SELECT RAISE(ABORT,'Synthetic history failure'); END`);
 try{assert.equal((await call('/api/admin/registrations/'+company,{user:admin,body:{status:'needs_info',reason:'Please provide a clearer document'}})).status,500);assert.equal(one('SELECT status FROM companies WHERE id=?',company).status,'pending');assert.equal(one('SELECT COUNT(*) n FROM notices').n,before);assert.equal(one('SELECT COUNT(*) n FROM registration_history WHERE company=?',company).n,0)}finally{db.exec('DROP TRIGGER registration_history_failure')}
});
test('Recovery link is one-time and revokes previous sessions', async () => {
  assert.equal((await call('/api/forgot', {
    body: {
      email: 'f1@test.test'
    }
  })).status, 200);
  const token = one('SELECT body FROM mail WHERE user=1 ORDER BY id DESC').body.split('#reset/')[1];
  assert.equal((await call('/api/reset', {
    user: a,
    body: {
      token,
      password: 'NewTesting@2026!'
    }
  })).status, 200);
  assert.equal((await call('/api/cases', {
    user: a
  })).status, 401);
  assert.equal((await call('/api/reset', {
    body: {
      token,
      password: pw
    }
  })).status, 400)
});
