# GitHub والموقع المباشر — النسخة الكاملة 8

المشروع في هذه الحزمة كامل حتى تحديث 8. لم ننفذ Push او نشر على حسابك. افتح مجلد IMC_Phase1 الذي يحتوي package.json وserver.mjs مباشرة.

## رفع الكود

ارفع محتويات مجلد المشروع بالكامل، بما فيها public وdocs وtest وملفات mjs وpackage.json وREADME و.gitignore و.env.example وسكربتات التشغيل. لا ترفع ZIP او public وحده. ملف .gitignore يستبعد data والمرفقات الخاصة و.env وقواعد SQLite وnode_modules والنسخ الاحتياطية. احتفظ ببياناتك المحلية في مجلد مشروعك الحالي؛ الحزمة الجديدة لا تحتويها.

ثبت Git من https://git-scm.com/downloads وNode.js 24 من https://nodejs.org اذا لم يكونا موجودين. من https://github.com/new انشئ IMC-Industrial-Challenges، واختر Private للكود الداخلي او Public للكود المتاح للجميع. لا تضف README او gitignore او License من صفحة الانشاء. انسخ رابط HTTPS للمستودع.

افتح PowerShell داخل مجلد IMC_Phase1 وشغل:

```powershell
git --version
node --version
npm run check
npm test
git init
git branch -M main
git add .
git status --short
git commit -m "Add IMC Phase 1 platform"
git remote add origin "PASTE_YOUR_REPOSITORY_URL_HERE"
git push -u origin main
```

استبدل PASTE_YOUR_REPOSITORY_URL_HERE برابط المستودع الحقيقي. راجع git status قبل commit: لا يجب وجود data او .env او SQLite. اكمل نافذة دخول GitHub عند ظهورها. اذا طلب Git اسمك وبريدك، نفذ التالي ثم اعد commit وpush:

```powershell
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

لو المجلد مرتبط بمستودع بالفعل، افحص git remote -v واستخدم git add وcommit وpush فقط، ولا تعد انشاء origin. لا تستخدم force push لعلاج خطأ تلقائيا.

رابط صفحة المستودع هو رابط مشاركة الكود. للمستودع الخاص اضف الزملاء من Settings > Collaborators. رابط الموقع العام لا يتطلب حساب GitHub او وصولا للمستودع الخاص.

## تشغيل الموقع على Render

GitHub Pages استضافة ثابتة ولن يشغل خادم Node.js وقاعدة SQLite في هذا المشروع. من https://render.com اربط حساب GitHub واسمح بالوصول لمستودع المشروع. اختر New > Web Service ثم Git Provider ثم المستودع.

| الاعداد | القيمة |
|---|---|
| Name | اسم متاح، مثلا imc-industrial-challenges |
| Language / Runtime | Node |
| Branch | main |
| Root Directory | فارغة، طالما package.json في جذر المستودع |
| Build Command | npm run check |
| Instance Type | Free للتجربة |

Start Command في Render فقط، انسخه كما هو:

```sh
node seed.mjs && env APP_ORIGIN="$RENDER_EXTERNAL_URL" node server.mjs
```

ينشئ الامر حسابات وطلبات التجربة عند عدم وجود قاعدة. Render يوفر RENDER_EXTERNAL_URL، والامر يمرره للخادم كعنوان الموقع حتى تقبل النماذج طلبات HTTPS الصحيحة. لا تستخدم هذا الامر حرفيا في PowerShell المحلي.

اضف Environment Variables:

| Key | Value |
|---|---|
| NODE_VERSION | 24.22.1 |
| DEMO_MODE | true |
| HOST | 0.0.0.0 |

اترك PORT للمنصة. لا تستخدم NODE_ENV=test. لا ترفع .env او تنسخ HOST=127.0.0.1 من .env.example الى الاستضافة. تأكيد البريد والمحمول ما زال مؤجلا حسب الاتفاق؛ لا يحتاج هذا العرض اعداد SMTP.

اضغط Create Web Service وانتظر Live. انسخ رابط https الذي ينتهي بـ onrender.com من صفحة الخدمة نفسها؛ الاسم الفعلي قد يختلف حسب التوفر. افتحه من نافذة خاصة ومن الهاتف قبل ارساله. لو ظهر خطأ مصدر الطلب، راجع Start Command كاملا. لو ظهر No open ports راجع HOST ونوع الخدمة Web Service.

## مشاركة الموقع والحسابات

ارسل رابط Render للشخص. يفتحه من المتصفح دون تنزيل الكود او تثبيت Node.js. يتصفح الواجهة العامة، ويدخل من دخول المنشآت بالحساب المناسب:

| الحساب | البريد | كلمة المرور |
|---|---|---|
| المصنع | factory@imc-demo.test | Factory@IMC2026! |
| الادارة | admin@imc-demo.test | Admin@IMC2026! |

هذه حسابات القاعدة الجديدة، وكل مستخدمي نفس الموقع يشاهدون بيانات مشتركة. للمقارنة افتح المصنع في نافذة عادية والادارة في نافذة خاصة. لا ترسل localhost:3000، لانه يشير لجهاز من يفتح الرابط.

## التخزين المجاني والدائم

Render Free يتوقف بعد 15 دقيقة بدون زيارات، وقد يحتاج نحو دقيقة عند الفتح التالي. SQLite والمرفقات الجديدة لا تستمر بعد التوقف او اعادة التشغيل او النشر. يعيد امر البداية انشاء بيانات التجربة الافتراضية اذا فقدت القاعدة. استخدم بيانات تجربة في هذه الخطة.

للاحتفاظ بالطلبات والمرفقات، اختر Web Service مدفوعة واضف Persistent Disk:

- Mount Path: /var/data/imc
- Environment Variable: DATA_DIR=/var/data/imc
- نفس امر البداية وباقي اعدادات العرض.

يحفظ القرص قاعدة SQLite والمرفقات معا. لا تنشئ Render Postgres لهذا الكود، فهو يستخدم SQLite. اطلع على سعر الخدمة والقرص في حسابك قبل الاختيار. هذه اعدادات احتفاظ ببيانات العرض؛ تجهيز التشغيل الرسمي له اعداداته المستقلة.

## تحديث الموقع بعد ذلك

```powershell
git add .
git commit -m "Update IMC platform"
git push
```

مع Auto-Deploy على main، ينشر Render التحديث ويحافظ على نفس الرابط. الخطة المجانية تعيد بيانات التشغيل كما سبق، والقرص الدائم مع DATA_DIR الصحيح يحافظ عليها. seed لا يعيد كتابة قاعدة بها حسابات.

للتشغيل المحلي ينزل زميلك المستودع من Code > Download ZIP ويفك الضغط، ثم يثبت Node.js 24 ويفتح start_windows.bat وhttp://localhost:3000. او يستخدم git clone لرابط المستودع ثم يدخل المجلد ويشغل node seed.mjs وnpm start. لكل جهاز قاعدة مستقلة.

## المصادر الرسمية — 17 نوفمبر 2026

- https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://render.com/docs/web-services
- https://render.com/docs/node-version
- https://render.com/docs/environment-variables
- https://render.com/docs/free
- https://render.com/docs/disks
