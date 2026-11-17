import {
  db,
  run,
  one,
  hash,
  now,
  DATA
} from './db.mjs';
import fs from 'node:fs';
if (process.env.DEMO_MODE === 'false') throw Error('Demo seed is disabled in production');
if (one('SELECT id FROM users LIMIT 1')) {
  console.log('Existing data preserved. No changes.');
  process.exit()
}
const c = Number(run(
  'INSERT INTO companies(name,commercial,tax,kind,representative,status,data,updated) VALUES(?,?,?,?,?,?,?,?)',
  'النيل للصناعات المتكاملة', 'DEMO-1001', '123456789', 'multi', 'owner', 'approved', JSON.stringify({
    address: 'القاهرة، مدينة بدر',
    imcClient: true,
    consent: true
  }), now()).lastInsertRowid);
run('INSERT INTO users(email,name,phone,role,hash,verified,company) VALUES(?,?,?,?,?,?,?)',
  'factory@imc-demo.test', 'أحمد محمود', '01000000000', 'factory', hash('Factory@IMC2026!'), 1, c);
run('INSERT INTO users(email,name,role,hash,verified) VALUES(?,?,?,?,?)', 'admin@imc-demo.test',
  'فريق مراجعة المركز', 'admin', hash('Admin@IMC2026!'), 1);
for (const [name, gov, city] of [
    ['مصنع النيل للعبوات', 'القاهرة', 'بدر'],
    ['مصنع النيل للمكونات', 'السويس', 'عتاقة']
  ]) run(
  'INSERT INTO factories(company,name,gov,city,region,sector,size,industrial,status) VALUES(?,?,?,?,?,?,?,?,?)',
  c, name, gov, city, 'القاهرة الكبرى والقناة', 'الصناعات الهندسية', 'medium', 'DEMO-IND-' + city,
  'approved');
const states = ['needs_info', 'assessment', 'submitted', 'assessed'];
const titles = ['تفاوت متانة العبوات أثناء النقل', 'تحسين كفاءة استهلاك الطاقة',
  'تطوير بديل محلي لمكون مستورد', 'فحص خواص خامة التغليف'
];
const demoForms = [{
  factory: '1',
  kind: 'challenge',
  area: 'quality',
  symptom: 'variation',
  probe: 'اختلاف بين الدفعات',
  frequency: 'weekly',
  scope: 'line',
  impacts: ['quality'],
  goal: 'quality',
  note: titles[0],
  _display: {
    area: 'جودة المنتج',
    symptom: 'تفاوت الأداء بين الدفعات',
    frequency: 'أسبوعيا',
    scope: 'خط إنتاج محدد',
    impacts: 'جودة المنتج',
    goal: 'تحديد سبب التفاوت وخفضه'
  }
}, {
  factory: '2',
  kind: 'improve',
  area: 'energy',
  symptom: 'energy_efficiency',
  probe: 'تحسين كفاءة التشغيل',
  scope: 'factory',
  impacts: ['energy'],
  goal: 'improve',
  note: titles[1],
  _display: {
    area: 'الطاقة والموارد',
    symptom: 'خفض استهلاك الطاقة',
    scope: 'المصنع بالكامل',
    impacts: 'ترشيد الطاقة والموارد',
    goal: 'دراسة فرص رفع الكفاءة'
  }
}, {
  factory: '2',
  kind: 'localize',
  opType: 'component',
  opName: titles[2],
  opDetails: 'دراسة تصنيع مكون تحكم محلي يحقق متطلبات خط الإنتاج مع التحقق من الأداء.',
  impacts: ['local'],
  goal: 'prototype',
  _display: {
    impacts: 'تقليل الاعتماد على الاستيراد',
    goal: 'دراسة جدوى تصنيع بديل محلي'
  }
}, {
  factory: '1',
  kind: 'lab',
  labKnowledge: 'exact',
  labArea: 'mechanical',
  labTest: 'tensile',
  labItemKind: 'material',
  labMaterialFamily: 'polymer',
  labMaterialType: 'فيلم بولي إيثيلين',
  labUse: 'quality',
  labSampleCount: '3',
  _display: {
    labKnowledge: 'أعرف الاختبار المطلوب',
    labArea: 'خواص ميكانيكية',
    labTest: 'اختبار الشد',
    labUse: 'التحقق من الجودة'
  }
}];
for (let i = 0; i < 4; i++) {
  const form = {
    ...demoForms[i],
    consent: true,
    additionalFactoryIds: []
  };
  let n = run('INSERT INTO cases(company,user,title,status,form,created,updated) VALUES(?,?,?,?,?,?,?)', c, 1,
    titles[i], states[i], JSON.stringify(form), now(), now()).lastInsertRowid;
  const steps = [
    ['submitted', 'تم استلام الطلب بنجاح']
  ];
  if (i !== 2) steps.push(['under_review', 'بدأ فريق المركز مراجعة تفاصيل الطلب']);
  if (i === 0) steps.push(['needs_info', 'يرجى توضيح ظروف النقل وإرفاق صورة للعينة المتأثرة.']);
  if (i === 1 || i === 3) steps.push(['assessment', 'جار تقييم الاحتياج داخل المركز']);
  if (i === 3) steps.push(['assessed',
    'اكتملت مراجعة طلب الاختبار وتوثيق احتياج العينة. الإسناد لمعمل لم يبدأ.'
  ]);
  for (const [kind, message] of steps) run(
    'INSERT INTO events(case_id,company,actor,kind,message,created) VALUES(?,?,?,?,?,?)', n, c, kind ===
    'submitted' ? 1 : 2, kind, message, now())
}
for (const [kind, plant] of [
    ['commercial', null],
    ['tax', null],
    ['industrial', 1],
    ['industrial', 2]
  ]) {
  const stored = 'approved-sample-' + kind + '-' + plant + '.txt';
  const contents = 'مستند افتراضي للعرض فقط. ليس وثيقة حكومية أو إثبات تسجيل.';
  fs.writeFileSync(DATA + '/uploads/' + stored, contents);
  run('INSERT INTO files(company,factory,kind,name,stored,type,size,created) VALUES(?,?,?,?,?,?,?,?)', c,
    plant, kind, 'نموذج افتراضي - ' + kind + '.txt', stored, 'text/plain; charset=utf-8', Buffer.byteLength(
      contents), now())
}
let pending = run(
  'INSERT INTO companies(name,commercial,tax,kind,representative,status,data,updated) VALUES(?,?,?,?,?,?,?,?)',
  'الدلتا للتصنيع — ملف تجريبي', 'DEMO-2002', '987654321', 'single', 'delegate', 'pending', JSON.stringify({
    address: 'العاشر من رمضان',
    job: 'مدير المصنع',
    consent: true
  }), now()).lastInsertRowid;
run('INSERT INTO users(email,name,phone,role,hash,verified,company) VALUES(?,?,?,?,?,?,?)',
  'review-sample@imc-demo.test', 'سارة إبراهيم', '01011111111', 'factory', hash('Unused-' + Math.random()),
  1, pending);
let f = run(
  'INSERT INTO factories(company,name,gov,city,region,sector,size,industrial) VALUES(?,?,?,?,?,?,?,?)',
  pending, 'مصنع الدلتا', 'الشرقية', 'العاشر من رمضان', 'القاهرة الكبرى والقناة', 'الصناعات الغذائية',
  'small', 'DEMO-IND-2002').lastInsertRowid;
for (const kind of ['commercial', 'tax', 'authorization', 'industrial']) {
  let stored = 'sample-' + kind + '.txt';
  fs.writeFileSync(DATA + '/uploads/' + stored, 'مستند توضيحي للتجربة فقط. ليس وثيقة حكومية.');
  run('INSERT INTO files(company,factory,kind,name,stored,type,size,created) VALUES(?,?,?,?,?,?,?,?)',
    pending, kind === 'industrial' ? f : null, kind, 'مثال توضيحي - ' + kind + '.txt', stored,
    'text/plain; charset=utf-8', 100, now())
}
console.log('Demo data ready. Credentials are in README_AR.md.');
