'use strict';
const $ = s => document.querySelector(s),
  esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  } [x]));
let session = {},
  cache = {},
  draft = {};
const statuses = {
  draft: 'مسودة',
  submitted: 'تم الاستلام',
  under_review: 'قيد المراجعة',
  needs_info: 'مطلوب استكمال',
  assessment: 'قيد التقييم',
  assessed: 'اكتملت المراجعة',
  assigned: 'تم الإسناد لجهة',
  in_progress: 'جار التنفيذ',
  solved: 'تم الحل',
  closed: 'أغلق دون تنفيذ',
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'لم يعتمد'
};
const kinds = {
  commercial: 'السجل التجاري',
  tax: 'البطاقة الضريبية',
  industrial: 'السجل الصناعي',
  authorization: 'التفويض أو التوكيل',
  license: 'رخصة التشغيل',
  extra: 'مستند إضافي',
  attachment: 'مرفق الطلب'
};
const date=v=>v?`<span data-timestamp="${esc(v)}">${new Date(v).toLocaleString(localStorage.getItem('imc-language')==='en'?'en-GB':'ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'})}</span>`:'—';
const badge = s => {
  const tone={pending:'blue',submitted:'blue',under_review:'blue',assessment:'blue',assessed:'blue',assigned:'blue',in_progress:'blue',needs_info:'amber',approved:'green',solved:'green',closed:'gray',draft:'gray',rejected:'red'}[s]||'gray';
  const paths={blue:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M12 7v5l3 2',amber:'M12 3 2 21h20L12 3zM12 9v5M12 17v1',green:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M8 12l3 3 5-6',gray:s==='draft'?'M6 3h9l4 4v14H6V3zM14 3v5h5M9 12h7M9 16h5':'M4 7h16v14H4V7zM3 3h18v4H3V3zM9 11h6',red:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M9 9l6 6M15 9l-6 6'};
  return `<span class="tag status-badge status-${tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[tone]}"/></svg><span>${esc(statuses[s]||s)}</span></span>`;
};
const btn = (text, href, cls = 'primary') => `<a class="btn ${cls}" href="#${href}">${text}</a>`;
const field=(name,label,type='text',value='',required=true,help='')=>{
  const attrs=type==='password'?'minlength="8" maxlength="128" autocomplete="new-password" spellcheck="false" autocapitalize="none"':type==='email'?'maxlength="254" autocomplete="email" spellcheck="false" dir="ltr"':type==='tel'?'maxlength="25" autocomplete="tel" inputmode="tel" dir="ltr"':'maxlength="300"';
  const input=`<input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${attrs}>`;
  const revealLabel=name==='confirmPassword'?'اظهار تأكيد كلمة المرور':name==='current'?'اظهار كلمة المرور الحالية':'اظهار كلمة المرور';
  const control=type==='password'?`<div class="password-control">${input}<button type="button" data-password-toggle aria-controls="${name}" aria-label="${revealLabel}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="eye-slash" d="m3 3 18 18"/></svg></button></div>`:input;
  return `<div class="field"><label for="${name}">${label} ${required?'<small> *</small>':'<small> (اختياري)</small>'}</label>${control}${help?`<small>${help}</small>`:''}</div>`;
};
const select = (name, label, opts, value = '', required = true) =>
  `<div class="field"><label for="${name}">${label}${required?' *':''}</label><select id="${name}" name="${name}" ${required?'required':''}><option value="">اختر</option>${opts.map(o=>{let [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(t)}</option>`}).join('')}</select></div>`;
const area = (name, label, value = '', required = true) =>
  `<div class="field"><label for="${name}">${label}${required?' *':''}</label><textarea id="${name}" name="${name}" maxlength="3000" ${required?'required':''}>${esc(value)}</textarea></div>`;

function toast(t) {
  $('#toast').textContent = t;
  $('#toast').style.display = 'block';
  setTimeout(() => $('#toast').style.display = 'none', 5000)
}
const pendingRequests=new Set();let signingOut=false,sessionEpoch=0;
async function api(p, method = 'GET', data) {
  const controller=new AbortController(),epoch=sessionEpoch;pendingRequests.add(controller);try{
  let headers = {};
  if (method !== 'GET') {
    headers['X-CSRF-Token'] = session.csrf || '';
    if (!(data instanceof FormData)) headers['Content-Type'] = 'application/json'
  }
  let r = await fetch('/api' + p, {
    signal:controller.signal,method,
    headers,
    body: method === 'GET' ? undefined : data instanceof FormData ? data : JSON.stringify(data || {})
  });
  let j = await r.json();
  if(epoch!==sessionEpoch)throw new DOMException('Request cancelled','AbortError');
  if (!r.ok) {const error=Error(j.error || 'تعذر تنفيذ الإجراء');error.status=r.status;throw error}
  return j
  }finally{pendingRequests.delete(controller)}
}

let formSequence=0;
function formHandler(id, fn) {
  const target = $(id);
  if(target&&!target.id)target.id='imc-form-'+(++formSequence);
  target?.querySelectorAll('[id][name]').forEach(el => {
    const old = el.id;
    const label = Array.from(target.querySelectorAll('label')).find(l => l.htmlFor === old);
    el.id = target.id + '-' + el.name;
    if (label) label.htmlFor = el.id;
    el.closest('.password-control')?.querySelector('[data-password-toggle]')?.setAttribute('aria-controls',el.id)
  });
  target?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget,
      submit = form.querySelector('button[type=submit]');
    $('.error-text')?.remove();
    try {
      if (submit) submit.disabled = true;
      if(window.IMCUI&&['authForm','passwordForm','tokenForm','factoryForm','companyForm','contactForm'].includes(form.id)&&!IMCUI.validatePanel(form))return;
      await fn(Object.fromEntries(new FormData(form)), form)
    } catch (err) {
      let d = document.createElement('div');
      d.className = 'notice error error-text';
      d.setAttribute('role', 'alert');
      d.textContent = err.message;
      form.prepend(d);
      d.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      })
    } finally {
      if (submit) submit.disabled = false
    }
  })
}
const header = portalHeader;
const footer = portalFooter;

function publicPage(html) {
  if(session.user){const page=location.hash.slice(1).split('/')[0]||'about';if(['about','services','faq'].includes(page)){const content=document.createElement('div');content.innerHTML=html;const section=content.querySelector('#'+page+'-section');if(section)html='<div class="landing-v2 signed-info">'+section.outerHTML+(page==='about'?content.querySelector('.about-evidence')?.outerHTML||'':'')+'</div>';}html=html.replaceAll('href="#register"','href="#start"');return shell('<div class="workspace-information">'+html+'</div>',page)}
  $('#app').innerHTML = header() + `<main id="main">${html}</main>` + footer()
}

function landing() {
  portalLanding()
}

function auth(mode) {
  if (mode === 'register') return fullRegistration();
  let register = mode === 'register',
    forgot = mode === 'forgot';
  publicPage(
    `<div class="auth auth-v5"><aside class="auth-story"><span class="section-kicker">معا لتطوير الصناعة المصرية</span><h2>خبرة مصنعك بداية لفرصة جديدة.</h2><p>حساب واحد يربط بيانات منشأتك ومصانعها وتحدياتها في رحلة واضحة مع مركز تحديث الصناعة.</p><img src="/assets/industry.svg" alt="مصنع متصل بمنظومة البحث والتطوير"><ul><li>ملف موحد للمنشأة ومصانعها</li><li>متابعة التحديات من مكان واحد</li><li>تواصل مباشر مع فريق المركز</li></ul></aside><div class="auth-card"><span class="tag">بوابة التحديات الصناعية</span><h1>${register?'إنشاء حساب المنشأة':forgot?'استعادة الوصول':'أهلا بعودتك'}</h1><p class="muted">${register?'ابدأ ببيانات مقدم الطلب، ثم أكمل ملف الشركة والمصانع.':forgot?'سنجهز رابط إعادة التعيين إذا كان البريد مسجلا.':'سجل الدخول لمتابعة طلباتك أو مراجعة ملفات المنشآت.'}</p><form id="authForm">${register?field('name','الاسم الكامل')+field('phone','رقم الهاتف','tel'):''}${field('email','البريد الإلكتروني','email')}${forgot?'':field('password','كلمة المرور','password','','true',mode==='login'?'':'8 احرف او ارقام او رموز على الاقل.')}${register?'<label class="check"><input type="checkbox" required><span>اطلعت على <a href="#privacy">سياسة استخدام البيانات</a> وأوافق على إنشاء الحساب.</span></label>':''}<button type="submit" class="btn primary" style="width:100%;margin-top:18px">${register?'إنشاء الحساب':forgot?'طلب رابط الاستعادة':'تسجيل الدخول'}</button></form><div class="actions" style="margin-top:18px">${btn(register?'لدي حساب':'إنشاء حساب',register?'login':'register','small')}<a href="#forgot">نسيت كلمة المرور؟</a></div></div></div>`
  );
  const loginPassword=$('#authForm [name=password]');if(mode==='login'&&loginPassword){loginPassword.minLength=1;IMCUI.prepareEmptyLogin($('#authForm'));}$('#authForm').noValidate=true;
  formHandler('#authForm', async b => {
    if (mode === 'login') {
      session = await api('/login', 'POST', b);
      location.hash = session.user.role==='factory'&&sessionStorage.getItem('imc-login-destination')==='new'?'new':'dashboard';sessionStorage.removeItem('imc-login-destination')
    } else {
      let r = await api(register ? '/register' : '/forgot', 'POST', b);
      toast(register ? 'تم إنشاء الحساب. سجل الدخول وأكد البريد.' : 'تمت معالجة طلب الاستعادة.');
      if (register) location.hash = 'login';

    }
  })
}

function shell(html,active='dashboard'){
if(signingOut)return;const admin=session.user.role==='admin';const nav=admin?[['dashboard','مركز الاجراءات'],['registrations','اعتماد المنشآت'],['cases','صندوق الطلبات'],['future','الجهات والشركاء'],['support','الدعم والمساعدة'],['activity','سجل اجراءات الادارة']]:[['dashboard','الرئيسية'],['cases','طلباتي'],['new','طلب جديد'],['profile','الشركة والمصانع'],['support','الدعم والمساعدة']];
$('#app').innerHTML=workspaceHeader(active,admin)+`<div class="workspace-layout"><div class="workspace-rail"><div class="rail-top"><button type="button" id="toggleNav" aria-label="فتح او طي قائمة الخدمات" aria-controls="workspaceNav" aria-expanded="true">${portalIcon('menu')}<span>قائمة الخدمات</span></button></div><aside class="workspace-side" id="workspaceNav"><div class="nav-section-label">${admin?'ادارة المنصة':'خدمات المنشأة'}</div><nav aria-label="القائمة الرئيسية">${nav.map(([key,label])=>`<a href="#${key}" ${active===key?'aria-current="page" class="active"':''}>${portalIcon(key)}<span>${label}</span></a>`).join('')}</nav><a class="nav-bottom" href="#help">${portalIcon('help')}دليل الاستخدام</a><button class="nav-sign-out" type="button" data-sign-out>${portalIcon('logout')}تسجيل الخروج</button></aside></div><div class="workspace-main"><main id="main" class="content">${pageTrail(active,location.hash.slice(1).split('/')[0])}${html}</main>${footer()}</div></div>`;
$('#toggleNav').onclick=()=>{const mobile=matchMedia('(max-width: 900px)').matches;if(mobile){const nav=$('#workspaceNav');nav.classList.toggle('is-open');$('#toggleNav').setAttribute('aria-expanded',String(nav.classList.contains('is-open')))}else{const closed=document.body.classList.toggle('nav-collapsed');sessionStorage.setItem('imc-nav-collapsed',String(closed));$('#toggleNav').setAttribute('aria-expanded',String(!closed))}};document.body.classList.toggle('nav-collapsed',sessionStorage.getItem('imc-nav-collapsed')==='true');$('#toggleNav').setAttribute('aria-expanded',String(!document.body.classList.contains('nav-collapsed')&&matchMedia('(min-width: 901px)').matches));refreshHeader();}
const heading = (title, desc = '', action = '') =>
  `<div class="page-head"><div><h1>${esc(title)}</h1><p class="muted">${esc(desc)}</p></div>${action}</div>`;

function rows(items,allowDelete=false) {
  return items.length ?
    `<div class="table-wrap"><table><thead><tr><th>الطلب</th><th>المنشأة</th><th>الحالة</th><th>آخر تحديث</th><th></th></tr></thead><tbody>${items.map(c=>`<tr><td class="title"><small class="code">IMC-${String(c.id).padStart(5,'0')}</small><br><a href="#${c.status==='draft'?'new':'case'}/${c.id}" data-user-content>${esc(c.title)}</a></td><td data-user-content>${esc(c.company_name||'منشأتي')}</td><td>${badge(c.status)}${c.closure_pending?'<small>طلب اغلاق بانتظار المركز</small>':''}</td><td>${date(c.updated)}</td><td>${btn('فتح',c.status==='draft'?'new/'+c.id:'case/'+c.id,'small')}${allowDelete&&session.user.role==='factory'&&c.status==='draft'?'<button type="button" class="btn small danger-outline" data-delete-case="'+c.id+'">حذف</button>':''}</td></tr>`).join('')}</tbody></table></div>` :
    `<div class="empty"><h3>لا توجد طلبات هنا بعد</h3><p>ستظهر الطلبات وتحديثاتها في هذا المكان.</p></div>`
}
async function dashboard() {
  let admin = session.user.role === 'admin';
  if(admin)return actionCenter('dashboard');
  const cases = await api('/cases');
  let profile = admin ? null : await api('/profile');
  let regs = admin ? await api('/admin/registrations') : [];
  let stats = admin ? [
    ['إجمالي الطلبات', cases.length],
    ['طلبات استكمال', cases.filter(c => c.status === 'needs_info').length],
    ['بانتظار الاعتماد', regs.filter(c => c.status === 'pending' || (c.status === 'approved' && c
      .pending_factories > 0)).length],
    ['اكتملت مراجعتها', cases.filter(c => c.status === 'assessed').length]
  ] : [
    ['طلبات منشأتك', cases.filter(c => c.status !== 'draft').length],
    ['تحتاج ردك', cases.filter(c => c.status === 'needs_info').length],
    ['مسودات محفوظة', cases.filter(c => c.status === 'draft').length],
    ['مصانع منشأتك', profile.factories.length]
  ];
  shell(
    `${heading(admin?'صورة أوضح، وقرار أسرع.':'كل احتياجات منشأتك، في مكان واحد.',admin?'متابعة ملفات التسجيل والطلبات وأولويات المراجعة':'تابع آخر المستجدات واستكمل ما يحتاجه فريق المركز.')}<section class="welcome"><div><span class="eyebrow">${admin?'مساحة عمل المركز':'خطوتك التالية'}</span><h2>${admin?'طلبات المصانع تبدأ من هنا':profile.company.status==='approved'?'منشأتك معتمدة. شارك احتياجك.':'أكمل ملف منشأتك للاعتماد'}</h2><p>${admin?'راجع بيانات المنشآت، ثم تابع التحديات ونتائج تقييمها.':'يمكنك حفظ المسودة والعودة إليها قبل إرسال الطلب.'}</p></div>${btn(admin?'مراجعة التسجيلات':'بدء الخطوة التالية',admin?'registrations':profile.company.status==='approved'?'new':'profile','gold')}</section>${!admin&&!session.demo&&!session.user.verified?'<div class="notice warn">بريدك غير مؤكد. افتح إعدادات الحساب للوصول إلى رابط التأكيد أو إعادة إرساله.</div>':''}<div class="stats">${stats.map((x,i)=>`<div class="stat stat-${i}"><i class="stat-icon">${portalIcon(['cases','tasks','registrations','profile'][i])}</i><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div><div class="card"><div class="split-row"><h3>آخر الطلبات</h3><a href="#cases">عرض الكل ←</a></div>${rows(cases.slice(0,5))}</div><div class="grid"><div class="card"><h3>رحلة الطلب</h3><p class="muted">استلام، مراجعة، تقييم، تحديد مسار، ثم تنفيذ وتوثيق النتيجة. أي طلب استكمال يظهر لك بوضوح.</p><a href="#help">تعرف على الخطوات ←</a></div><div class="card"><h3>${admin?'إحصاءات من الطلبات المسجلة':'بياناتك في نطاق المراجعة'}</h3><p class="muted">${admin?'تتحدث مؤشرات المتابعة من الطلبات المسجلة، وتساعد على رصد الأولويات وتوزيع الاحتياجات الصناعية.':'يتابع فريق المركز تقييم الطلب وتوجيهه إلى الجهة المناسبة، مع توثيق التحديثات والنتائج.'}</p></div></div>`
  )
}
async function casesPage(history=false) {
  cache.cases = await api('/cases');
  if(history)cache.cases=cache.cases.filter(c=>['solved','closed'].includes(c.status));
  shell(
    `${heading(history?'سجل الطلبات المنتهية':session.user.role==='admin'?'صندوق الطلبات':'طلباتي','بحث ومتابعة لكل طلب من الإرسال إلى القرار.',session.user.role==='admin'?'<a class="btn" href="/api/admin/export">تصدير CSV</a>':'<div class="actions">'+btn('طلب جديد','new')+btn('سلة المحذوفات','trash','')+btn('سجل الطلبات','history','')+'</div>')}<div class="card"><div class="toolbar"><input id="search" type="search" placeholder="ابحث برقم الطلب او عنوانه او اسم المنشأة او المصنع" aria-label="بحث الطلبات"><select id="filter" aria-label="الحالة"><option value="">كل الحالات</option>${Object.entries(statuses).filter(([k])=>!['pending','approved','rejected',...(session.user.role==='admin'?['draft']:[])].includes(k)).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><small id="count"></small></div><div id="list">${rows(cache.cases,true)}</div></div>`,
    'cases');

  function filter() {
    const a = cache.cases.filter(x=>(!$('#filter').value||x.status===$('#filter').value)&&IMCRecords.matches(x,$('#search').value));
    $('#list').innerHTML = rows(a,true);
    bindCaseDeletion(a);
    $('#count').textContent = a.length + ' طلب'
  }
  $('#search').oninput = filter;
  $('#filter').onchange = filter;
  filter()
}
const govs = ['القاهرة', 'الجيزة', 'القليوبية', 'الإسكندرية', 'البحيرة', 'مطروح', 'الشرقية', 'الدقهلية',
  'كفر الشيخ', 'الغربية', 'المنوفية', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء',
  'جنوب سيناء', 'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر',
  'الوادي الجديد'
];
const cities = {
  'القاهرة': ['القاهرة', 'بدر', '15 مايو'],
  'الجيزة': ['الجيزة', '6 أكتوبر', 'الشيخ زايد'],
  'القليوبية': ['بنها', 'العبور', 'شبرا الخيمة'],
  'الإسكندرية': ['الإسكندرية', 'برج العرب'],
  'الشرقية': ['الزقازيق', 'العاشر من رمضان', 'بلبيس'],
  'السويس': ['السويس', 'عتاقة'],
  'المنوفية': ['شبين الكوم', 'السادات'],
  'الدقهلية': ['المنصورة', 'جمصة']
};
const sectors = ['الصناعات الغذائية', 'الصناعات الهندسية', 'الصناعات الكيماوية', 'مواد البناء',
  'الغزل والنسيج', 'الملابس الجاهزة', 'الطباعة والتغليف', 'الأخشاب والأثاث', 'الجلود والأحذية',
  'الأدوية والمستلزمات الطبية', 'الصناعات المعدنية', 'السيارات ووسائل النقل', 'أخرى'
];
const sub = {
  'الصناعات الغذائية': ['ألبان', 'مشروبات', 'مخبوزات', 'أغذية محفوظة'],
  'الصناعات الهندسية': ['معدات وآلات', 'كهرباء وإلكترونيات', 'مكونات معدنية'],
  'الصناعات الكيماوية': ['بلاستيك ومطاط', 'دهانات', 'كيماويات وأسمدة'],
  'مواد البناء': ['أسمنت وخرسانة', 'سيراميك وزجاج', 'رخام وجرانيت', 'مواد عزل'],
  'الغزل والنسيج': ['غزل', 'نسيج', 'صباغة وتجهيز'],
  'الملابس الجاهزة': ['ملابس منسوجة', 'تريكو', 'ملابس عمل'],
  'الطباعة والتغليف': ['عبوات ورقية', 'عبوات بلاستيكية', 'طباعة', 'تغليف مرن'],
  'الأخشاب والأثاث': ['أثاث منزلي', 'أثاث مكتبي', 'منتجات خشبية'],
  'الجلود والأحذية': ['دباغة', 'منتجات جلدية', 'أحذية'],
  'الأدوية والمستلزمات الطبية': ['أدوية', 'مستلزمات طبية', 'أجهزة طبية'],
  'الصناعات المعدنية': ['تشكيل معادن', 'سباكة', 'درفلة', 'منتجات معدنية'],
  'السيارات ووسائل النقل': ['مكونات سيارات', 'تجميع مركبات', 'معدات نقل']
};

function factoryForm() {
  return `<form id="factoryForm"><div class="grid">${field('name','اسم المصنع')}${field('industrial','رقم السجل الصناعي')}<div class="location-section form-grid-span"><h3>موقع المصنع</h3><div class="grid">${select('gov','المحافظة',govs)}${IMCUI.locationFields()}</div></div>${IMCUI.activityFields()}${select('size','نطاق المبيعات السنوية',[['micro','أقل من مليون جنيه'],['small','من مليون إلى 50 مليون جنيه'],['medium','أكثر من 50 إلى 200 مليون جنيه'],['large','أكثر من 200 مليون جنيه'],['unknown','منشأة جديدة دون سنة مالية مكتملة']])}${field('year','السنة المالية','number',new Date().getFullYear()-1)}${field('address','العنوان التفصيلي')}</div><button type="submit" class="btn primary">إضافة المصنع للمراجعة</button><small>　هذه نطاقات تحليلية للمشروع وليست شهادة تصنيف قانوني للمنشأة.</small></form>`
}

function bindFactory() {
  if (!$('#factoryForm')) return;
  IMCUI.bindLocation($('#factoryForm'));
  IMCUI.bindActivity($('#factoryForm'));
  formHandler('#factoryForm', async b => {
    b.sectorChoice=b.sector==='أخرى'?'other':'catalog';if(b.sectorChoice==='other')b.sector=b.sectorOther;if(b.subsector==='أخرى'||b.sectorChoice==='other')b.subsector=b.subsectorOther;
    if(!IMCValidation.industrial(b.industrial))throw Error('راجع رقم السجل الصناعي كما يظهر بالمستند');
    b.region = ['القاهرة', 'الجيزة', 'القليوبية', 'الشرقية', 'السويس', 'الإسماعيلية', 'بورسعيد',
      'شمال سيناء', 'جنوب سيناء'
    ].includes(b.gov) ? 'القاهرة الكبرى والقناة' : ['بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج',
      'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد'
    ].includes(b.gov) ? 'الجنوب' : 'الشمال';
    const edit = $('#factoryForm').dataset.edit;
    await api('/factories' + (edit ? '/' + edit : ''), 'POST', b);
    toast(edit ? 'تم تحديث المصنع' : 'تمت إضافة المصنع. ارفع سجله الصناعي.');
    await profilePage()
  })
}
const filesList = files => files.length ? files.map(f =>
  `<div class="kv"><span>${esc(kinds[f.kind]||f.kind)}${f.factory?' • مصنع '+f.factory:''}</span><a href="/api/files/${f.id}">${esc(f.name)} ↓</a></div>`
).join('') : '<p class="muted">لم ترفع مستندات بعد.</p>';

function uploadForm(factories = [], caseId = null) {
  return `<form id="uploadForm" class="upload-row"><div class="grid">${caseId?`<input type="hidden" name="kind" value="attachment"><input type="hidden" name="case_id" value="${caseId}">`:select('kind','نوع المستند',Object.entries(kinds).filter(([k])=>k!=='attachment'&&(!cache.approvedProfile||k==='industrial')))}${caseId?'':select('factory','المصنع المرتبط بالسجل الصناعي',factories.map(f=>[f.id,f.name]),'',false)}<div class="field"><label for="file">اختر الملف *</label><input id="file" type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required><small>PDF أو صورة PNG/JPG واضحة، حتى 5 MB. المستندات ليست جزءا من التحليلات.</small></div></div><button type="submit" class="btn">رفع الملف</button></form>`
}

function bindUpload(refresh) {
  formHandler('#uploadForm', async (b, f) => {
    await api('/upload', 'POST', new FormData(f));
    toast('تم حفظ الملف');
    await refresh()
  })
}
async function profilePage() {
  let pr = await api('/profile'),
    c = pr.company,
    d = JSON.parse(c.data),
    editable = ['draft', 'needs_info', 'rejected'].includes(c.status);
  cache.approvedProfile=c.status==='approved';
  shell(
    `${heading('الشركة والمصانع','سجل الشركة مرة واحدة، وأضف المصانع التابعة لها.',badge(c.status))}<div class="registration-steps"><a href="#company-section">1 بيانات المنشأة</a><a href="#factory-section">2 المصانع</a><a href="#docs-section">3 المستندات والمراجعة</a></div>${c.reason?`<div class="notice ${c.status==='approved'?'':'warn'}">قرار المركز: ${esc(c.reason)}</div>`:''}${!session.demo&&!session.user.verified?`<div class="notice warn">أكد البريد الإلكتروني قبل إرسال ملف الاعتماد. <a href="#settings">فتح إعدادات الحساب والبريد</a></div>`:''}<section id="company-section" class="card"><h2>بيانات المنشأة ومقدم الطلب</h2>${editable?`<form id="companyForm"><div class="grid">${field('name','الاسم القانوني للشركة / المنشأة','text',c.name)}${select('kind','نوع التسجيل',[['single','منشأة بها مصنع واحد'],['multi','شركة تمتلك عدة مصانع']],c.kind)}${select('representative','صفة مقدم الطلب',[['owner','صاحب المنشأة'],['legal','الممثل القانوني للشركة'],['delegate','مفوض عن المنشأة']],c.representative)}${field('job','المسمى الوظيفي','text',d.job)}${select('commercialType','نوع رقم السجل التجاري',[['local','رقم القيد بمكتب السجل'],['unified','الرقم الموحد للسجل']],d.commercialType||'local')}${field('commercial','رقم السجل التجاري','text',c.commercial)}${field('commercialOffice','مكتب السجل التجاري','text',d.commercialOffice,d.commercialType!=='unified')}${field('tax','رقم التسجيل الضريبي','text',c.tax,true,'9 أرقام كما تظهر بالبطاقة الضريبية.')}${select('imcClient','هل المنشأة عميل حالي للمركز؟',[['yes','نعم'],['no','لا']],d.imcClient?'yes':'no')}${field('imcCode','كود عميل IMC','text',d.imcCode,false,'مطلوب إذا كانت المنشأة عميلا سابقا أو حاليا للمركز.')}${field('address','عنوان المقر الرئيسي','text',d.address)}</div><label class="check"><input name="consent" type="checkbox" ${d.consent?'checked':''} required><span>أقر بصحة البيانات وبصلاحية تمثيل المنشأة وأوافق على استخدامها للتحقق والتواصل داخل المركز.</span></label><div class="notice">اذا اخترت الممثل القانوني او المفوض، ارفق مستندا يثبت صفتك وصلاحيتك لتمثيل المنشأة.</div><button type="submit" class="btn primary">حفظ بيانات المنشأة</button></form>`:`<div class="grid"><div>${kv('الاسم القانوني',c.name)+kv('السجل التجاري',c.commercial)+kv('نوع رقم السجل التجاري',d.commercialType==='unified'?'الرقم الموحد للسجل':'رقم القيد بمكتب السجل',true)+(d.commercialType!=='unified'?kv('مكتب السجل التجاري',d.commercialOffice):'')+kv('الرقم الضريبي',c.tax)+kv('عميل IMC',d.imcClient?'نعم':'لا',true)+kv('كود العميل',d.imcCode)}</div><div>${kv('مقدم الطلب',session.user.name)+kv('صفة التسجيل',({owner:'صاحب المنشأة',legal:'الممثل القانوني',delegate:'مفوض'})[c.representative],true)+kv('المقر',d.address)}</div></div>`}</section><section id="factory-section" class="card"><h2>مصانع المنشأة</h2>${pr.factories.map(f=>`<div class="kv"><span><b>${esc(f.name)}</b><br>${esc(f.gov)} • ${esc(f.city)} • ${esc(f.sector)}${JSON.parse(f.data).industrialZone?'<br>'+esc(JSON.parse(f.data).industrialZone):''}</span><strong>${badge(f.status)} ${c.status!=='pending'&&f.status!=='approved'?`<button class="btn small" data-edit-plant="${f.id}">تعديل</button>`:''}</strong></div>`).join('')||'<p class="muted">أضف المصنع الأول.</p>'}${c.status!=='pending'?`<details style="margin-top:25px" ${pr.factories.length?'':'open'}><summary>＋ إضافة مصنع تابع للشركة</summary><div style="padding-top:25px">${factoryForm()}</div></details>`:''}</section><section id="docs-section" class="card"><h2>مستندات التحقق</h2><p class="muted">السجل التجاري والبطاقة الضريبية للشركة، والسجل الصناعي لكل مصنع، واثبات الصفة او التفويض عند التقديم كممثل قانوني او مفوض.</p>${filesList(pr.files)}${editable?'<p>يمكن استبدال المستند او اضافة نسخة اوضح اذا طلب المركز استكمال الملف. النسخ السابقة تبقى في سجل المستندات.</p>'+uploadForm(pr.factories):c.status==='approved'&&pr.factories.some(f=>f.status==='pending')?'<p>ارفع السجل الصناعي للمصنع الجديد فقط ليراجعه المركز.</p>'+uploadForm(pr.factories.filter(f=>f.status==='pending')):''}${editable?'<div class="notice">تأكد من وضوح المستندات وتطابقها مع البيانات. يمكنك الرجوع لاستكمال الملف إذا طلب المركز معلومات إضافية.</div><button id="submitRegistration" class="btn primary">إرسال الملف لاعتماد المركز</button>':''}${c.status==='approved'&&pr.factories.some(f=>f.status==='pending')?'<div class="notice">مصانعك الجديدة بانتظار مراجعة الإدارة. يمكن للإدارة إعادة اعتماد الملف بعد استكمال سجلاتها.</div>':''}</section>`,
    'profile');
  const companyForm=$('#companyForm');if(companyForm){const type=companyForm.elements.commercialType;type.onchange=()=>{companyForm.elements.commercialOffice.required=type.value!=='unified';companyForm.elements.commercialOffice.closest('.field').hidden=type.value==='unified'};type.onchange();}
  formHandler('#companyForm', async b => {
    b.consent = b.consent === 'on';if(!IMCValidation.job(b.job))throw Error('اكتب مسمى وظيفيا واضحا بالحروف');if(!IMCValidation.commercial(b.commercial,b.commercialType,b.commercialOffice))throw Error('راجع رقم السجل التجاري ونوع الرقم ومكتب القيد');
    if (b.imcClient === 'yes' && !b.imcCode) throw Error('أدخل كود عميل IMC');
    await api('/profile', 'POST', b);
    toast('تم حفظ بيانات المنشأة');
    await profilePage()
  });
  bindFactory();
  document.querySelectorAll('[data-edit-plant]').forEach(button => button.onclick = () => {
    let f = pr.factories.find(x => String(x.id) === button.dataset.editPlant),
      data = {
        ...f,
        ...JSON.parse(f.data)
      };
    const form = $('#factoryForm');
    form.closest('details').open = true;
    form.dataset.edit = f.id;
    for (const k of ['gov', 'sector']) {
      form.elements[k].value = data[k] || '';
      form.elements[k].dispatchEvent(new Event('change'))
    }
    for (const [k, v] of Object.entries(data)) {
      if (form.elements[k]) form.elements[k].value = v || ''
    }
    form._restoreLocation?.(data);
    form._restoreActivity?.(data);
    form.querySelector('button[type=submit]').textContent = 'حفظ تعديل المصنع';
    form.scrollIntoView({
      behavior: 'smooth'
    })
  });
  bindUpload(profilePage);
  $('#submitRegistration')?.addEventListener('click', async () => {
    try {
      await api('/registration/submit', 'POST');
      toast('تم إرسال الملف للمراجعة');
      await profilePage()
    } catch (e) {
      toast(e.message)
    }
  });
  document.querySelectorAll('.registration-steps a').forEach(a => a.onclick = e => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    })
  })
}
const kv = (k, v, translateValue=false) => `<div class="kv"><span>${esc(k)}</span><strong ${translateValue?'':'data-user-content'}>${esc(v||'—')}</strong></div>`;
async function newCase(n) {
  await saveQueue;
  const pr = await api('/profile');
  if ((!session.demo&&!session.user.verified) || pr.company.status !== 'approved' || !pr.factories.some(f => f.status ===
      'approved')) {
    shell(
      `${heading('تقديم طلب جديد')}<div class="card"><h2>ملف المنشأة يحتاج اعتمادا أولا</h2><p>أكمل بيانات المنشأة والمستندات وانتظر اعتماد المركز لبدء تقديم الطلبات.</p>${btn('استكمال ملف المنشأة','profile')}</div>`,
      'new');
    return
  }
  let c = n ? await api('/cases/' + n) : null;
  if (c && c.status !== 'draft') {
    location.hash = 'case/' + n;
    return
  }
  draft = {
    id: c?.id,
    version: c?.version,
    state: c ? JSON.parse(c.form) : null
  };
  cache.factories = pr.factories.filter(f => f.status === 'approved').map(f => ({
    id: String(f.id),
    name: f.name,
    company: pr.company.name,
    sector: f.sector,
    region: f.region,
    gov: f.gov,
    city: f.city,
    size: ({
      small: 'صغير',
      medium: 'متوسط',
      large: 'كبير',
      micro: 'أقل من مليون',
      unknown: 'جديد'
    })[f.size],
    client: JSON.parse(pr.company.data).imcClient ? 'نعم' : 'لا'
  }));
  shell(
    `${heading('تسجيل تحد أو فرصة تطوير','كل الأسئلة تتغير وفق احتياجك. تحفظ المسودة في حساب المنشأة.',`<span id="draftStatus" class="form-status">جار تحميل النموذج…</span>`)}<iframe id="formFrame" title="استمارة التحديات الصناعية" class="frame" src="/form.html"></iframe>`,
    'new')
}
let saveQueue = Promise.resolve();
window.addEventListener('message', async e => {
  const frame = $('#formFrame');
  if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
  let msg = e.data;
  if (msg.type === 'ready') frame.contentWindow.postMessage({
    type: 'init',
    factories: cache.factories,
    state: draft.state
  }, location.origin);
  if (msg.type === 'scrollTop') frame.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
  if (msg.type === 'height') frame.style.height = Math.max(750, Math.min(7000, msg.height)) + 'px';
  if ((msg.type === 'save' || msg.type === 'submit') && session.user&&!signingOut) {
    const context = draft;
    saveQueue = saveQueue.then(async () => {
      if(signingOut||!session.user)return;
      let r = await api('/cases' + (context.id ? '/' + context.id : ''), 'POST', {
        form: msg.state,
        version: context.version,
        submit: msg.type === 'submit'
      });
      context.id = r.id;
      context.version = r.version;
      context.state = msg.state;
      if ($('#draftStatus')) $('#draftStatus').textContent = 'تم الحفظ ' + new Date()
        .toLocaleTimeString(localStorage.getItem('imc-language')==='en'?'en-GB':'ar-EG', {
          hour: '2-digit',
          minute: '2-digit'
        });
      if (msg.type === 'submit') {
        toast('تم إرسال الطلب بنجاح');
        location.hash = 'case/' + r.id
      }
    }).catch(err => {
      if(err.name==='AbortError'||signingOut)return;
      if ($('#draftStatus')) $('#draftStatus').textContent = 'لم يتم الحفظ';
      toast(err.message);
      frame.contentWindow.postMessage({
        type: 'error',
        message: err.message
      }, location.origin)
    })
  }
});
async function casePage(n){return caseWorkspace(n)}
async function registrations(n){return n?registrationWorkspace(n):registrationsDirectory()}

async function future() {
  return partnersPage()
}
async function settings() {
  let mails = session.demo ? await api('/mail') : [];
  shell(
    `${heading('إعدادات الحساب','إدارة كلمة المرور وتأكيد البريد الإلكتروني.')}<div class="grid"><div class="card"><h2>بيانات الحساب</h2>${kv('الاسم',session.user.name)+kv('البريد',session.user.email)+kv('حالة البريد',session.user.verified?'مؤكد':'بانتظار التأكيد',true)}${!session.user.verified?'<button id="resend" class="btn">إعادة إرسال رابط التأكيد</button>':''}</div><div class="card"><h2>تغيير كلمة المرور</h2><form id="passwordForm">${field('current','كلمة المرور الحالية','password')}${field('password','كلمة المرور الجديدة','password')}<button type="submit" class="btn primary">حفظ وإعادة تسجيل الدخول</button></form></div></div>${session.demo?`<div class="card"><h2>رسائل الحساب</h2><p class="muted">روابط تأكيد البريد واستعادة الوصول الخاصة بحسابك.</p>${mails.map(m=>`<div class="kv"><span>${esc(m.subject)}<br><small>${date(m.created)}</small></span><a class="btn small" href="${esc(m.body.slice(m.body.indexOf('/#')+1))}">فتح الرابط</a></div>`).join('')||'<p>لا توجد رسائل.</p>'}</div>`:''}`,
    'settings');
  formHandler('#passwordForm', async b => {
    await api('/password', 'POST', b);
    session = {};
    location.hash = 'login';
    toast('تم تغيير كلمة المرور')
  });
  $('#resend')?.addEventListener('click', async () => {
    try {
      await api('/resend', 'POST', {
        email: session.user.email
      });
      await settings();
      toast('تم تجهيز رابط التأكيد')
    } catch (e) {
      toast(e.message)
    }
  })
}

function help(privacy = false) {
  if(!privacy)return guidePage();
  const html = heading(privacy ? 'الخصوصية واستخدام البيانات' : 'دليل الاستخدام') +
    `<div class="card">${privacy?`<h2>نطاق المعالجة</h2><p>تجمع المنصة بيانات مقدم الطلب والشركة ومصانعها ومستندات التحقق، ومحتوى التحديات وردود المراجعة. الغرض هو اعتماد المنشأة وتقييم الطلب والتواصل بشأنه داخل المركز.</p><h3>الوصول والمشاركة</h3><p>يرى مستخدم المنشأة بيانات شركته فقط. يراجع فريق المركز الملفات وفق صلاحياته. الملاحظات الداخلية لا تظهر للمصنع، والمستندات الحساسة لا تدخل في تصدير التحليلات. توجيه الطلب لجهة مسجلة يوثقه المركز في سجل الطلب؛ لا يمنح تسجيل الإسناد وصولا آليا إلى مستندات المنشأة.</p><h3>الاستفسارات والتصحيح</h3><p>للاستفسار عن استخدام البيانات أو طلب تصحيحها، تواصل مع مركز تحديث الصناعة عبر info@imc-egypt.org. مشاركة الملفات مع الجهات تخضع للإجراء الذي يحدده المركز وصلاحيات الوصول.</p>`:`<h2>للمصنع</h2><p>1. استكمل ملف التسجيل بجميع البيانات والمستندات.<br>2. ارسل الملف المكتمل للمراجعة.<br>3. تابع قرار اعتماد المركز.<br>4. قدم التحدي عبر الاستمارة الموجهة، وأضف مرفقات من صفحة الطلب.<br>5. تابع سجل الطلب، ورد على طلب الاستكمال.</p><h2>لإدارة المركز</h2><p>راجع ملف المنشأة وصفة المتقدم والمستندات والتكرار، ثم سجل القرار. افتح الطلبات واطلب استكمالا أو ابدأ التقييم أو سجل نتيجة المراجعة. الإغلاق يتطلب سببا واضحا للمصنع.</p><h3>معنى حالات الطلب</h3><p>«مطلوب استكمال» يعني أن الرد عند المصنع. بعد الرد يعود الطلب للمراجعة. «اكتملت المراجعة» تعني انتهاء تقييم المركز. إغلاق الطلب لا يعني بالضرورة حل المشكلة الصناعية.</p>`}</div>`;
  if (session.user) shell(html, 'help');
  else publicPage(`<div class="section">${html}</div>`)
}
async function route() {
  if(signingOut)return;
  window.scrollTo(0, 0);
  try {
    session = await api('/session');
    let [page, n] = location.hash.slice(1).split('/');
    if (['verify', 'reset'].includes(page)) {
      publicPage(
        `<div class="auth"><div class="auth-card"><h1>${page==='verify'?'تأكيد البريد الإلكتروني':'كلمة مرور جديدة'}</h1><form id="tokenForm">${page==='reset'?field('password','كلمة المرور الجديدة','password'): '<p>اضغط للتأكيد وإكمال تسجيل المنشأة.</p>'}<button type="submit" class="btn primary">${page==='verify'?'تأكيد البريد':'حفظ كلمة المرور'}</button></form></div></div>`
      );
      formHandler('#tokenForm', async b => {
        await api('/' + page, 'POST', {
          ...b,
          token: n
        });
        toast('تم بنجاح');
        location.hash = session.user ? 'profile' : 'login'
      });
      return
    }
    if(page==='start'){sessionStorage.setItem('imc-login-destination','new');if(!session.user){location.hash='register';return}if(session.user.role==='factory'){location.hash='new';return}shell(heading('تقديم التحديات الصناعية')+'<div class="card"><p>تقديم التحديات متاح من حساب المنشأة الصناعية.</p><button class="btn primary" type="button" data-sign-out>تسجيل الخروج والدخول بحساب المنشأة</button></div>','start');return}
    if (['about', 'services', 'faq'].includes(page)) return portalLanding(page);
    if(page==='support'&&!session.user)return await supportPage(n);
    if (page === 'privacy' || page === 'help') return help(page === 'privacy');
    if (!session.user) {
      if (['login', 'register', 'forgot'].includes(page)) return auth(page);
      return landing()
    }
    if (!page || ['login', 'register'].includes(page)) {
      location.hash = 'dashboard';
      return
    }
    if(page==='support')return await supportPage(n);if(page==='activity'&&session.user.role==='admin')return await adminActivity();if(page==='tasks'&&session.user.role==='admin')return await actionCenter();
    if (page === 'dashboard') return await dashboard();
    if(page==='history'&&session.user.role==='factory')return await casesPage(true);
    if(page==='trash'&&session.user.role==='factory')return await trashPage();
    if (page === 'cases') return await casesPage();
    if (page === 'case') return await casePage(n);
    if (page === 'new' && session.user.role === 'factory') return await newCase(n);
    if (page === 'profile' && session.user.role === 'factory') return await profilePage();
    if (page === 'settings') return await settings();
    if (page === 'notices') {
      let a = await api('/notices');
      shell(heading('الإشعارات') +
        `<div class="card">${a.map(x=>`<div class="kv"><span data-user-content>${esc(x.title)}</span><small>${date(x.created)}</small></div>`).join('')||'<div class="empty">لا توجد إشعارات بعد</div>'}</div>`,
        'notices');
      await api('/notices', 'POST');
      return
    }
    if (session.user.role === 'admin') {
      if (['registrations', 'registration'].includes(page)) return await registrations(n);
      if (page === 'future') return future();
      if(page==='audit'){location.hash='activity';return}
    }
    shell('<div class="card"><h2>الصفحة غير موجودة</h2>' + btn('العودة للرئيسية', 'dashboard') + '</div>')
  } catch (e) {
    if(e.name==='AbortError'||signingOut)return;
    toast(e.message);
    if (!$('#main')) publicPage('<div class="auth card">تعذر تحميل الصفحة. أعد المحاولة.</div>')
  }
  window.scrollTo(0, 0)
}
window.addEventListener('hashchange', route);
route();
