'use strict';
const partnerTypes = {
  program: 'البرامج',
  sector: 'القطاعات',
  university: 'الجامعات',
  research: 'المراكز البحثية',
  lab: 'المعامل',
  funder: 'جهات التمويل'
};
const nextStates = {
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

function portalRibbon() {
  return `<div class="institution-ribbon"><span><img class="egypt-flag" src="/assets/egypt.svg" alt="علم جمهورية مصر العربية">جمهورية مصر العربية <b>وزارة الصناعة</b></span><div><a href="https://www.imc-egypt.org/index.php/ar" target="_blank" rel="noopener">مركز تحديث الصناعة ↗</a><a href="#support">الدعم والمساعدة</a><button type="button" class="text-size-toggle" data-text-size aria-label="تكبير حجم النص">A+</button><button type="button" class="language-toggle" data-language-toggle>English</button></div></div>`
}

function portalHeader() {
  return `${portalRibbon()}<header class="topbar brand-header"><a class="brand-lockup" href="#"><img class="brand" src="/assets/logo.png" alt="مركز تحديث الصناعة ووزارة الصناعة"><span class="public-brand-copy"><strong>منصة التحديات الصناعية</strong><small>من احتياجات الصناعة الى حلول قابلة للتطبيق</small></span></a><nav class="public-nav"><a href="#">الرئيسية</a><a href="#about">عن المنصة</a><a href="#services">مسارات الدعم</a><a href="#faq">الأسئلة الشائعة</a></nav><div class="actions">${btn('دخول المنشآت','login','')}${btn('تسجيل منشأة','register','primary')}</div></header>`
}

function portalFooter() {
  return `<footer class="portal-footer"><div class="footer-grid"><div class="footer-intro"><img src="/assets/logo.png" alt="مركز تحديث الصناعة"><h3>منصة التحديات الصناعية</h3><p>نقطة التقاء احتياجات الصناعة المصرية مع قدرات البحث والتطوير. رحلة موثقة من التحدي إلى الأثر.</p></div><div><h4>اكتشف المنصة</h4><a href="#about">عن المنصة</a><a href="#services">أنواع الطلبات</a><a href="#faq">الأسئلة الشائعة</a><a href="#help">دليل الاستخدام</a><a href="#support">الدعم والمساعدة</a></div><div><h4>خدمات المنشآت</h4>${session.user?(session.user.role==='admin'?'<a href="#registrations">اعتماد المنشآت</a><a href="#cases">صندوق الطلبات</a>':'<a href="#profile">الشركة والمصانع</a><a href="#new">تسجيل تحد صناعي</a>'):'<a href="#register">تسجيل منشأة صناعية</a><a href="#start">تسجيل تحد صناعي</a>'}<a href="#privacy">الخصوصية واستخدام البيانات</a><a href="https://www.imc-egypt.org/index.php/ar" target="_blank" rel="noopener">الموقع الرسمي للمركز ↗</a></div><div><h4>تواصل مع المركز</h4><p>جمهورية مصر العربية<br>مركز تحديث الصناعة</p><a href="mailto:info@imc-egypt.org" dir="ltr">info@imc-egypt.org</a><a href="https://www.imc-egypt.org/ar/contactus-ar/item/1419-2024-06-27-07-29-47.html" target="_blank" rel="noopener">بيانات المقر والفروع ↗</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} مركز تحديث الصناعة. جميع الحقوق محفوظة.</span><span>الصناعة المصرية · الابتكار · التنمية</span><a href="#main" data-scroll-top>العودة إلى أعلى ↑</a></div></footer>`
}

function faqMarkup() {
  return `<div class="faq-list">${[
['ما الهدف من منصة التحديات الصناعية؟','توحيد استقبال احتياجات المصانع وتوثيقها ومراجعتها، وتحديد مسار الدعم والجهة المناسبة ومتابعة التنفيذ والنتيجة.'],
['ما المستندات المطلوبة للتسجيل؟','السجل التجاري والبطاقة الضريبية للمنشأة، والسجل الصناعي لكل مصنع. عند التسجيل كممثل قانوني او مفوض يلزم ارفاق اثبات الصفة او التفويض / التوكيل.'],
['هل يمكن تسجيل شركة لديها أكثر من مصنع؟','نعم، اختر شركة متعددة المصانع وأدخل بيانات كل مصنع وسجله الصناعي. ترتبط المصانع بملف منشأة واحد ويمكن ربط الطلب بأكثر من مصنع.'],
['أنا عميل سابق للمركز، ماذا أحتاج؟','اختر «نعم» في سؤال عميل IMC وأدخل كود العميل.'],
['هل أحتاج معرفة السبب الفني للمشكلة؟','لا. سجل ما لاحظته واختر أقرب وصف. تساعد الأسئلة الموجهة فريق المركز على فهم الاحتياج دون مطالبتك بتشخيص علمي.'],
['كيف أتابع طلبا بعد تقديمه؟','من حساب المنشأة ستجد حالة الطلب وخط مراحله ورسائل المركز والمرفقات. عند طلب معلومات إضافية يمكنك الرد من الصفحة نفسها.'],
['كيف تختار الجامعة أو الجهة البحثية؟','تحدد الإدارة الجهة من دليل الشركاء المسجلين وفق تقييم الطلب. يظهر الإسناد في سجل الطلب، ثم تسجل متابعة التنفيذ ونتيجته.'],

].map((x,i)=>`<details><summary><span class="faq-no">${String(i+1).padStart(2,'0')}</span>${x[0]}<span class="faq-plus">＋</span></summary><p>${x[1]}</p></details>`).join('')}</div>`
}

function portalLanding(section) {
  publicPage(
    `<div class="landing-v2"><section class="hero-v2"><div class="hero-copy"><div class="eyebrow"><span class="status-dot"></span>منصة التحديات الصناعية المصرية</div><h1>من قلب المصنع،<br>تبدأ <em>فرص التطوير.</em></h1><p>شارك تحديات منشأتك واحتياجاتها الفنية. نربط الملاحظة بالتقييم، والبحث بالتطبيق، لفتح آفاق أوسع للصناعة المصرية.</p><div class="actions">${btn('ابدأ تسجيل منشأتك ←','register','gold')}${btn('تعرف على مسارات الدعم','services','outline-light')}</div><div class="hero-trust"><span>تسجيل موحد للشركة ومصانعها</span><span>متابعة موثقة لكل طلب</span><span>تقييم فني داخل المركز</span></div></div><div class="hero-art" aria-label="رسم صناعي يوضح الربط بين المصنع والبحث والتطوير"><div class="art-orbit"></div><div class="art-label label-one"><i></i>الصناعة المصرية</div><img src="/assets/industry.svg" alt="منشأة صناعية وشبكة لربط احتياجات الإنتاج بالبحث والتطوير"><div class="art-label label-two">بحث وتطوير <span>←</span> أثر صناعي</div><div class="art-caption"><b>من الاحتياج إلى التطبيق</b><small>بيانات واضحة. جهة مناسبة. متابعة مستمرة.</small></div></div><div class="hero-bottom"><span>منصة واحدة، لمسارات صناعية متعددة</span><span>جميع محافظات مصر <b>٢٧</b></span></div></section><div class="value-strip"><div><b>01</b><span>عرفنا بمنشأتك<small>شركة واحدة ومصانع مترابطة</small></span></div><div><b>02</b><span>وثق احتياجك<small>أسئلة موجهة حسب نوع الطلب</small></span></div><div><b>03</b><span>تابع مسار الدعم<small>مراجعة وإسناد وتنفيذ ونتيجة</small></span></div></div><section class="editorial-section" id="about-section"><div class="section-kicker">عن المنصة / 01</div><div class="editorial-grid"><h2>المعرفة تبدأ بسؤال.<br><span>والتطوير يبدأ باحتياج واضح.</span></h2><div><p class="large-copy">كل تحد داخل المصنع يحمل فرصة لرفع الكفاءة أو تطوير منتج أو توطين مكون. تجمع المنصة هذه الاحتياجات في مسار منظم يديره مركز تحديث الصناعة.</p><p>يعمل المركز على دعم المنشآت الصناعية وتعزيز قدرتها التنافسية. وتوفر المنصة مساحة لتوثيق التحديات، وتحديد الأولويات، وتوجيهها للقدرات الفنية والبحثية المناسبة.</p><a class="text-link" href="https://www.imc-egypt.org/index.php/ar" target="_blank" rel="noopener">تعرف على مركز تحديث الصناعة ↗</a></div></div></section><section class="editorial-section about-evidence"><div class="about-visual-row"><div class="editorial-visual"><img src="/assets/research.svg" alt="ربط المصنع بالبحث والتجربة والاختبار"></div><div><span class="section-kicker">ربط الخبرة بالتطبيق</span><h2>احتياج صناعي واضح.<br>وقدرة بحثية مناسبة.</h2><p>يبدا المسار من ملاحظة المصنع، ثم تقييم المركز، ثم تحديد الجهة المناسبة لدراسة الاحتياج. تساعد بيانات القطاعات والمواقع والانشطة على بناء صورة اوضح للاحتياجات الصناعية في مصر.</p><p>يستطيع المصنع متابعة حالة طلبه والاسئلة الموجهة اليه، وبعد الاسناد متابعة مراحل المشروع والتحديثات والنتائج المسجلة.</p></div></div><div class="about-capabilities">${[['profile','المصنع يحدد الاحتياج','بيانات موحدة للمصانع وتحديات قابلة للمراجعة.'],['research','الخبرة تبحث وتجرب','ربط الاحتياج بقدرات الجامعة او المركز البحثي او المعمل.'],['tasks','المتابعة توثق التقدم','مراحل واضحة وتحديثات ونتيجة مرتبطة بدليل.']].map(([icon,title,copy])=>`<div class="capability">${portalIcon(icon)}<h3>${title}</h3><p>${copy}</p></div>`).join('')}</div></section><section class="services-section" id="services-section"><div class="section-kicker">مسارات الدعم / 02</div><div class="split-row"><h2>أيا كان احتياج مصنعك،<br>ابدأ من هنا.</h2><p>اختر المسار الأقرب لما تعرفه.<br>الأسئلة التالية تتكيف مع اختيارك.</p></div><div class="service-list">${[['01','تحد فني أو تشغيلي','جودة متغيرة، توقفات، هالك أو مشكلة تحتاج إلى فهم أسبابها.'],['02','تحسين الكفاءة والأداء','فرص لرفع الإنتاجية وترشيد الطاقة وتحسين العمليات.'],['03','فكرة منتج أو عملية جديدة','احتياج لدراسة فكرة أو تطوير نموذج أولي والتحقق من أدائه.'],['04','تصنيع بديل محلي','توطين منتج أو خامة أو مكون يتم استيراده.'],['05','فحص أو اختبار','اختبار محدد أو قياس خاصية لمادة أو منتج.']].map(x=>`<a href="#register"><span class="service-index">${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p><span class="service-arrow">↖</span></a>`).join('')}</div></section><section class="journey-section"><div><span class="section-kicker">رحلة المنشأة / 03</span><h2>خطوات واضحة،<br>من البداية للنهاية.</h2><p>تعرف دائما أين يقف طلبك وما الخطوة التالية.</p>${btn('سجل منشأتك','register','gold')}</div><ol>${[['التسجيل والتحقق','استكمل بيانات الشركة والمصانع والمستندات ليراجعها المركز.'],['تقديم التحدي','سجل الملاحظة والأثر والنتيجة المطلوبة من خلال الاستمارة الموجهة.'],['التقييم وتحديد المسار','يراجع المركز الطلب ويحدد الجهة المناسبة من الشركاء المسجلين.'],['متابعة المشروع وتوثيق النتيجة','تابع الجهة المسند اليها الطلب، وخطة المشروع ومراحل الدراسة والتطوير والاختبار حتى النتيجة النهائية.']].map(x=>`<li><h3>${x[0]}</h3><p>${x[1]}</p></li>`).join('')}</ol></section><section class="editorial-section faq-section" id="faq-section"><div><span class="section-kicker">الأسئلة الشائعة / 04</span><h2>قبل أن تبدأ.</h2><p>إجابات تساعدك على تجهيز ملف منشأتك.</p></div>${faqMarkup()}</section><section class="register-cta"><div><span>ابدأ الخطوة الأولى</span><h2>احتياج مصنعك يستحق أن يصل.</h2></div>${btn('تسجيل منشأة صناعية ←','register','gold')}</section></div>`
    );
  if (section) requestAnimationFrame(() => document.getElementById(section + '-section')?.scrollIntoView({
    behavior: 'smooth'
  }));
}

function regionFor(gov) {
  return ['القاهرة', 'الجيزة', 'القليوبية', 'الشرقية', 'السويس', 'الإسماعيلية', 'بورسعيد', 'شمال سيناء',
    'جنوب سيناء'
  ].includes(gov) ? 'القاهرة الكبرى والقناة' : ['بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
    'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد'
  ].includes(gov) ? 'الجنوب' : 'الشمال'
}

function fullRegistration() {
  publicPage(
    `<section class="enrollment"><div class="enrollment-heading"><span class="section-kicker">انضم إلى منظومة التطوير الصناعي</span><h1>تسجيل منشأة صناعية</h1><p>جهز السجل التجاري والبطاقة الضريبية والسجل الصناعي لكل مصنع. جميع البيانات الأساسية والمستندات مطلوبة قبل إنشاء ملف التسجيل.</p></div><div class="enrollment-layout"><aside class="enrollment-aside"><img class="enrollment-illustration" src="/assets/research.svg" alt="رحلة المصنع من التسجيل الى الدراسة والتطوير"><h3>ملف متكامل من البداية</h3><p>تسجيل الشركة ومصانعها في رحلة واحدة.</p><ol id="enrollSteps">${['مقدم الطلب','المنشأة','المصانع','المستندات والإرسال'].map((x,i)=>`<li data-stage="${i}"><b>${i+1}</b>${x}</li>`).join('')}</ol><div class="enroll-help">هل أنت عميل للمركز؟<br><small>احتفظ بكود العميل لإدخاله ضمن بيانات المنشأة.</small></div></aside><form id="enrollForm" class="card enrollment-form"><section data-panel="0"><div class="form-heading"><small>الخطوة 01</small><h2>من يسجل باسم المنشأة؟</h2><p>بيانات الشخص المسؤول عن الطلب والتواصل.</p></div><div class="grid">${field('applicant','الاسم الكامل','text','',true,'اكتب الاسم كما يظهر بالمستندات، اسمين على الاقل.')}${field('job','المسمى الوظيفي')}${field('phone','رقم المحمول','tel','',true,'')}${field('email','البريد الإلكتروني','email')}${field('password','كلمة المرور','password','',true,'8 احرف او ارقام او رموز على الاقل.')}${field('confirmPassword','تأكيد كلمة المرور','password')}</div>${select('representative','صفة مقدم الطلب',[['owner','صاحب المنشأة'],['legal','الممثل القانوني'],['delegate','مفوض عن المنشأة']])}<div class="notice" id="representationHint" hidden>يلزم ارفاق توكيل او تفويض او مستند يثبت صفتك وصلاحيتك لتمثيل المنشأة في خطوة المستندات.</div></section><section data-panel="1" hidden><div class="form-heading"><small>الخطوة 02</small><h2>الكيان القانوني للمنشأة</h2><p>تسجل هذه البيانات مرة واحدة للشركة وجميع مصانعها.</p></div><div class="grid">${field('companyName','الاسم القانوني للمنشأة')}${select('companyKind','نوع المنشأة',[['single','منشأة بمصنع واحد'],['multi','شركة متعددة المصانع']])}${select('commercialType','نوع رقم السجل التجاري',[['local','رقم القيد بمكتب السجل'],['unified','الرقم الموحد للسجل']],'local')}${field('commercial','رقم السجل التجاري','text','',true,'انقل الرقم من المستند. الرقم الموحد 15 رقما؛ رقم القيد المحلي قد يختلف في الطول.')}${field('commercialOffice','مكتب السجل التجاري')}${field('tax','رقم التسجيل الضريبي','text','',true,'9 أرقام كما تظهر بالبطاقة الضريبية')}${field('hq','عنوان المقر الرئيسي')}${select('imcClient','هل المنشأة عميل سابق أو حالي لدى IMC؟',[['yes','نعم'],['no','لا']])}</div><div id="clientCodeWrap" hidden>${field('imcCode','كود عميل IMC','text','',false,'يحفظ الكود لاستخدامه في الربط مع سجلات المركز لاحقا.')}</div></section><section data-panel="2" hidden><div class="form-heading"><small>الخطوة 03</small><h2>بيانات المصانع التابعة</h2><p>تغذي بيانات الموقع والنشاط وحجم المصنع تحليل الاحتياجات الصناعية.</p></div><div id="plantsContainer"></div><button type="button" id="addPlant" class="btn">＋ إضافة مصنع آخر</button></section><section data-panel="3" hidden><div class="form-heading"><small>الخطوة 04</small><h2>المستندات والمراجعة النهائية</h2><p>ملفات PDF أو PNG أو JPG واضحة، بحد أقصى 5 MB لكل مستند.</p></div><div class="document-grid">${documentInput('commercial','السجل التجاري')}${documentInput('tax','البطاقة الضريبية')}<div id="authorizationWrap" hidden>${documentInput('authorization','اثبات الصفة او التفويض / التوكيل')}</div></div><div id="enrollSummary" class="registration-summary"></div><label class="check"><input name="consent" type="checkbox" required><span>أقر بصحة البيانات والمستندات وصلاحيتي لتمثيل المنشأة، وأوافق على استخدامها للتحقق والتواصل وتقييم الطلبات. <a href="#privacy" target="_blank">سياسة استخدام البيانات</a></span></label><p class="muted">بعد الارسال، يراجع فريق المركز ملف المنشأة والمستندات لاعتماده.</p></section><div class="login-prompt"><span>لديك حساب بالفعل؟</span><a class="btn login-existing" href="#login">${portalIcon('login')}تسجيل الدخول</a></div><div class="wizard-actions"><button type="button" id="enrollBack" class="btn">السابق</button><span id="enrollPosition"></span><button type="button" id="enrollNext" class="btn primary">متابعة ←</button><button type="submit" id="enrollSubmit" class="btn primary" hidden>إرسال ملف التسجيل</button></div></form></div></section>`
    );
  let step = 0,
    count = 0;
  const form = $('#enrollForm');

  function show() {
    form.querySelectorAll('[data-panel]').forEach((p, i) => p.hidden = i !== step);
    $('#enrollBack').disabled = step === 0;
    $('#enrollNext').hidden = step === 3;
    $('#enrollSubmit').hidden = step !== 3;
    $('#enrollPosition').textContent = `${step+1} من 4`;
    document.querySelectorAll('[data-stage]').forEach((el, i) => el.classList.toggle('active', i <= step));
    form.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  function value(k) {
    return form.elements[k].value.trim()
  }

  function fieldError(name,message){const el=form.elements[name];form.querySelectorAll('.input-error').forEach(x=>x.remove());form.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));const error=document.createElement('p');error.className='input-error';error.id='registration-error-'+name;error.setAttribute('role','alert');error.textContent=window.IMCI18n?.t(message)||message;el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',error.id);el.closest('.field')?.append(error);el.focus();return false;}
  function validPanel() {
    const panel=form.querySelector(`[data-panel="${step}"]`);if(!IMCUI.validatePanel(panel))return false;
    if (step === 0 && value('password') !== value('confirmPassword')) {
      toast('كلمتا المرور غير متطابقتين');
      return false
    }
    if (step === 1 && !/^\d{9}$/.test(IMCValidation.digits(value('tax')).replace(/[-\s]/g, ''))) {
      toast('رقم التسجيل الضريبي 9 أرقام');
      return false
    }
    if(step===0){if(!IMCValidation.fullName(value('applicant'))){return fieldError('applicant','ادخل الاسم الكامل، اسمين على الاقل دون ارقام')}if(!IMCValidation.email(value('email'))){return fieldError('email','ادخل بريدا الكترونيا صحيحا مثل name@example.com')}if(!IMCValidation.mobile(value('phone'))){return fieldError('phone','ادخل رقم محمول مصري صحيحا من 11 رقما')}if(!IMCValidation.job(value('job'))){return fieldError('job','اكتب مسمى وظيفيا واضحا بالحروف')}}
    if(step===1&&!IMCValidation.commercial(value('commercial'),value('commercialType'),value('commercialOffice'))){return fieldError('commercial','راجع رقم السجل التجاري ونوع الرقم ومكتب القيد')}
    if(step===2){for(const el of form.querySelectorAll('.plant-entry'))if(!IMCValidation.industrial(value('industrial_'+el.dataset.index))){toast('راجع رقم السجل الصناعي كما يظهر بالمستند');return false}}
    return true
  }

  function addPlant() {
    if (form.querySelectorAll('.plant-entry').length >= 20) {
      toast('الحد الأقصى لملف تسجيل واحد عشرون مصنعا');
      return
    }
    const i = count++;
    const el = document.createElement('div');
    el.className = 'plant-entry';
    el.dataset.index = i;
    el.innerHTML =
      `<div class="split-row"><h3>المصنع ${i+1}</h3>${i?'<button type="button" class="btn small remove-plant">إزالة</button>':''}</div><div class="grid">${field('plantName_'+i,'اسم المصنع')}${field('industrial_'+i,'رقم السجل الصناعي')}<div class="location-section form-grid-span"><h4>موقع المصنع</h4><div class="grid">${select('gov_'+i,'المحافظة',govs)}${IMCUI.locationFields('_'+i)}${field('plantAddress_'+i,'العنوان التفصيلي')}</div></div>${IMCUI.activityFields('_'+i)}${select('size_'+i,'نطاق المبيعات السنوية بالجنيه',[['micro','أقل من مليون'],['small','من مليون إلى 50 مليون'],['medium','أكثر من 50 إلى 200 مليون'],['large','أكثر من 200 مليون'],['unknown','منشأة جديدة دون سنة مكتملة']])}${field('year_'+i,'السنة المالية','number',new Date().getFullYear()-1)}</div>${documentInput('industrial_'+i,'السجل الصناعي لهذا المصنع')}`;
    $('#plantsContainer').append(el);IMCUI.bindLocation(form,'_'+i);
    IMCUI.bindActivity(form,'_'+i);
    el.querySelector('.remove-plant')?.addEventListener('click', () => {
      el.remove();
    });
  }
  form.elements.imcClient.onchange = () => {
    const yes = value('imcClient') === 'yes';
    $('#clientCodeWrap').hidden = !yes;
    form.elements.imcCode.required = yes;
    if (!yes) form.elements.imcCode.value = ''
  };
  form.elements.commercialType.onchange=()=>{const unified=value('commercialType')==='unified';form.elements.commercialOffice.required=!unified;form.elements.commercialOffice.closest('.field').hidden=unified};
  form.elements.representative.onchange = () => {
    const delegate = ['legal','delegate'].includes(value('representative'));
    $('#authorizationWrap').hidden = !delegate;
    form.querySelector('[name="doc_authorization"]').required = delegate;$('#representationHint').hidden=!delegate
  };
  form.querySelector('[name="doc_authorization"]').required = false;
  form.elements.companyKind.onchange = () => {
    $('#addPlant').hidden = value('companyKind') !== 'multi'
  };
  $('#addPlant').hidden = true;
  $('#addPlant').onclick = addPlant;
  addPlant();
  $('#enrollNext').onclick = () => {
    if (!validPanel()) return;
    if (step === 2 && value('companyKind') === 'single' && form.querySelectorAll('.plant-entry').length !==
      1) {
      toast('المنشأة ذات المصنع الواحد يجب أن تحتوي مصنعا واحدا');
      return
    }
    step++;
    if (step === 3) $('#enrollSummary').textContent =
      `${value('companyName')} — ${form.querySelectorAll('.plant-entry').length} مصنع — مقدم الطلب: ${value('applicant')} — ${value('email')}`;
    show()
  };
  $('#enrollBack').onclick = () => {
    step--;
    show()
  };
  form.noValidate = true;
  formHandler('#enrollForm', async () => {
    if (!validPanel()) return;
    const company = {
      name: value('companyName'),
      commercial: IMCValidation.digits(value('commercial')),commercialType:value('commercialType'),commercialOffice:value('commercialOffice'),
      tax: IMCValidation.digits(value('tax')),
      kind: value('companyKind'),
      representative: value('representative'),
      address: value('hq'),
      job: value('job'),
      imcClient: value('imcClient'),
      imcCode: value('imcCode'),
      consent: form.elements.consent.checked
    };
    const fd = new FormData(),
      factories = [];
    for (const [index, el] of [...form.querySelectorAll('.plant-entry')].entries()) {
      const i = el.dataset.index;
      const gov = value('gov_' + i);
      factories.push({
        name: value('plantName_' + i),
        industrial: IMCValidation.digits(value('industrial_' + i)),
        gov,
        city:value('city_'+i),districtChoice:value('districtChoice_'+i),locationType:value('locationType_'+i),zoneChoice:value('zoneChoice_'+i),industrialZone:value('industrialZone_'+i),
        region: regionFor(gov),
        sectorChoice:value('sector_'+i)==='أخرى'?'other':'catalog',
        sector: value('sector_'+i)==='أخرى'?value('sectorOther_'+i):value('sector_'+i),
        subsector: value('sector_'+i)==='أخرى'||value('subsector_' + i) === 'أخرى' ? value('subsectorOther_' + i) : value(
          'subsector_' + i),
        size: value('size_' + i),
        year: value('year_' + i),
        address: value('plantAddress_' + i)
      });
      fd.set('industrial_' + index, form.elements['doc_industrial_' + i].files[0]);
    }
    for (const k of ['commercial', 'tax', ...(['legal','delegate'].includes(company.representative) ? [
        'authorization'] : [])]) fd.set(k, form.elements['doc_' + k].files[0]);
    for (const [, file] of fd)
      if (file.size > 5 * 1024 * 1024) throw Error('الحد الأقصى لكل مستند 5 MB');
    fd.set('payload', JSON.stringify({
      name: value('applicant'),
      phone: value('phone'),
      email: value('email'),
      password: form.elements.password.value,
      company,
      factories
    }));
    const r = await api('/register-complete', 'POST', fd);
    publicPage(
      `<section class="enrollment"><div class="card success-panel"><span class="success-check">✓</span><h1>تم استلام ملف منشأتك</h1><p>${r.verificationRequired?'البيانات والمستندات محفوظة. اكد بريدك الالكتروني لبدء المراجعة.':'وصلت البيانات والمستندات الى فريق المركز للمراجعة. يمكنك الدخول لمتابعة حالة الاعتماد.'}</p>${r.verificationRequired&&!r.mailSent?'<p>تعذر إرسال رسالة التأكيد الآن. يمكنك إعادة طلبها من إعدادات الحساب.</p>':''}${btn('تسجيل الدخول ومتابعة الملف','login')}</div></section>`
      )
  });
  show();
}

function documentInput(key, label) {
  return `<div class="document-input"><label for="doc_${key}"><span class="document-icon">↥</span><b>${label} *</b><small>PDF / PNG / JPG · حتى 5 MB</small></label><input id="doc_${key}" name="doc_${key}" type="file" accept=".pdf,.png,.jpg,.jpeg" required></div>`
}

function workflowMarkup(c) {
  const w = c.workflow || {},
    states = ['assigned', 'in_progress', 'solved'],
    stage = states.indexOf(c.status);
  return `<div class="workflow-result"><div class="split-row"><h3>التنفيذ والنتيجة</h3>${badge(c.status)}</div>${c.status==='closed'?'<p>أغلق الطلب دون استكمال التنفيذ. السبب موثق في سجل المتابعة.</p>':`<div class="execution-track">${['الإسناد لجهة','جار التنفيذ','تم الحل'].map((s,i)=>`<span class="${stage>=i?'reached':''}"><b>${stage>i?'✓':i+1}</b>${s}</span>`).join('')}</div>${kv('الجهة المسند إليها',w.partner||'لم يتم الإسناد بعد')}${w.program?kv('البرنامج',w.program):''}${w.due?kv('الموعد المستهدف',w.due):''}${w.note?kv('تحديث التنفيذ',w.note):''}${w.evidence?kv('توثيق الحل',w.evidence):''}`}</div>`
}

function assignmentFields(partners,a){const opts=k=>partners.filter(p=>p.active&&(k==='partner'?['university','research','lab'].includes(p.kind):p.kind===k)).map(p=>[p.id,p.name]);return `<div class="grid">${select('partner','الجامعة / المؤسسة البحثية / المعمل',opts('partner'),a.partner)}${select('program','برنامج المركز',opts('program'),a.program,false)}${select('sector','القطاع المسؤول',opts('sector'),a.sector,false)}${field('owner','مسؤول المتابعة','text',a.owner,false)}${field('due','الموعد المستهدف','date',a.due,false)}</div>${!opts('partner').length?'<p class="notice">لا توجد جهات بحثية مسجلة للاختيار حاليا. يتاح الاسناد عند تسجيل جهة لدى المركز.</p>':''}`}
async function partnersPage() {
  const all = await api('/admin/partners');
  shell(
    `${heading('الجهات والشركاء','دليل موحد للجهات المتاحة لتوجيه الطلبات ومتابعة تنفيذها.')}<div class="partner-directory">${Object.entries(partnerTypes).map(([k,v])=>{const list=all.filter(p=>p.kind===k);return `<section class="card partner-card"><div class="split-row"><span class="partner-emblem">${portalIcon(k)}</span></div><h2>${v}</h2><p class="muted">${k==='program'?'برامج الدعم والخدمات':k==='sector'?'الاختصاصات داخل المركز':'الجهات المسجلة في منظومة الشركاء'}</p>${select('directory_'+k,'الجهات المسجلة',list.map(p=>[p.id,p.name]),'',false)}<small>${list.length?'متاحة للاختيار في توجيه الطلب':'ستظهر الجهات هنا عند تسجيلها لدى المركز'}</small></section>`}).join('')}</div><section class="card"><div class="split-row"><div><h2>تسجيل جهة في الدليل</h2><p class="muted">تضاف الجهة إلى قوائم الاختيار مباشرة. لا ينشئ ذلك حساب دخول ولا يرسل بيانات المصنع خارج المنصة.</p></div></div><form id="partnerForm"><div class="grid">${select('kind','تصنيف الجهة',Object.entries(partnerTypes))}${field('name','اسم الجهة')}${field('code','كود الجهة','text','',false)}${field('contact','وسيلة التواصل','text','',false)}</div><button type="submit" class="btn primary">حفظ الجهة في الدليل</button></form></section>`,
    'future');
  formHandler('#partnerForm', async b => {
    await api('/admin/partners', 'POST', b);
    toast('تم تسجيل الجهة');
    await partnersPage()
  })
}

function portalIcon(name) {
  const paths = {attachment:'M8 12l6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8M7 13l7-7',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',factory:'M3 21V9l6 4V7l6 4V3h5v18zM7 17h2M12 17h2M17 17h2',logout:'M9 4H4v16h5M10 12h12M18 8l4 4-4 4',login:'M15 4h5v16h-5M2 12h12M10 8l4 4-4 4',switch:'M4 7h15M15 3l4 4-4 4M20 17H5M9 13l-4 4 4 4',chevron:'M6 9l6 6 6-6',menu:'M3 6h18M3 12h18M3 18h18',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 18v1M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20',back:'M14 5l-7 7 7 7M7 12h14',tasks:'M4 5h16v16H4zM8 2v6M16 2v6M8 12l2 2 5-5',support:'M4 14V9a8 8 0 0 1 16 0v5M4 10H2v7h4v-7zM18 10h4v7h-4zM18 19l-4 3h-4',activity:'M4 3h16v18H4zM8 7h8M8 12h8M8 17h4',
    dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    registrations: 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',
    profile: 'M3 21V8l6 3V8l6 3V4h6v17zM7 16h1M12 16h1M17 16h1',
    cases: 'M3 6h18v15H3zM8 6V3h8v3M3 11h18',
    new: 'M12 4v16M4 12h16',
    future: 'M12 3l9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8',
    audit: 'M5 4h14v17H5zM8 8h8M8 12h8M8 16h5',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
    notices: 'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4zM10 21h4',
    program: 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',
    sector: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    university: 'M2 9l10-6 10 6M4 10h16M6 10v9M12 10v9M18 10v9M3 21h18',
    research: 'M9 3h6M10 3v6l-5 10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2L14 9V3M8 15h8',
    lab: 'M8 3h8M10 3v7l-5 9v2h14v-2l-5-9V3M9 15h6',
    funder: 'M3 7h18v14H3zM7 7V3h10v4M3 12h18M10 12v4h4v-4'
  };
  return `<svg class="portal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.profile}"/></svg>`;
}
