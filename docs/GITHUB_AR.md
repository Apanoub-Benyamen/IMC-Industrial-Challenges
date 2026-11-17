لخطوات الاستضافة ومشاركة رابط الموقع راجع [دليل GitHub وRender](HOSTING_AR.md).

# رفع المشروع على GitHub

## تجهيز المجلد

استخدم الحزمة الكاملة `IMC_Phase1_v8_Full_Project.zip`، وفكها. افتح مجلد `IMC_Phase1` الذي يحتوي `package.json` و`server.mjs` و`README.md`، وليس ملف ZIP نفسه. ارفع ملفات المشروع من داخل هذا المجلد.

المشروع يحتوي `.gitignore` لاستبعاد `data` وقواعد SQLite وملفات `.env` والمرفقات الخاصة. لا تحذف هذا الملف. الشعار والخطوط والرسومات جزء من ملفات الواجهة المطلوبة للتشغيل.

ثبت Git اذا لم يكن موجودا. افتح Terminal او PowerShell داخل مجلد المشروع وشغل:

```sh
git --version
node --version
npm run check
npm test
```

يتطلب المشروع Node.js 24 او احدث. لا تحتاج `npm install` لان المشروع لا يستخدم حزم تشغيل خارجية.

## اول رفع لمستودع جديد

1. من GitHub اختر New repository.
2. سم المستودع مثلا `IMC-Industrial-Challenges`، واختر درجة اتاحته المناسبة لك.
3. اترك اختيارات اضافة README او License او gitignore فارغة، لان ملفات المشروع جاهزة عندك.
4. اضغط Create repository وانسخ رابط HTTPS الذي يظهر لك.
5. نفذ الاوامر التالية داخل مجلد المشروع. استبدل `YOUR_REPOSITORY_URL` بالرابط الذي نسخته.

```sh
git init
git branch -M main
git add .
git status --short
git commit -m "Add IMC Phase 1 platform"
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

قبل commit يجب ان تعرض قائمة الملفات الكود والمستندات فقط، دون قاعدة البيانات او المرفقات الخاصة. اذا طلب Git تسجيل الدخول، اكمل نافذة GitHub التي يفتحها على جهازك.

اذا كانت هذه اول مرة تستخدم Git وطلب اسمك وبريدك، سجلهما على جهازك ثم اعد امر commit:

```sh
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

## لو المشروع في مستودع موجود بالفعل

لا تنشئ مستودعا جديدا ولا تعيد اضافة origin. انسخ التغييرات الى مجلد المستودع، واحتفظ بـ `data`، ثم:

```sh
git status --short
git add .
git commit -m "Improve IMC casework and support workflows"
git push
```

لرؤية الرابط الحالي:

```sh
git remote -v
```

اذا ظهر `remote origin already exists` اثناء تجهيز مستودع جديد، راجع الرابط الحالي اولا. اذا كان هو المستودع المطلوب، تخط امر اضافة origin. اذا كان رابطا مختلفا وتريد تغييره فعلا، استخدم:

```sh
git remote set-url origin YOUR_REPOSITORY_URL
```

## زميلك او مديرك يشغل المشروع ازاي

بعد تنزيل المستودع وفك الضغط، يشغل `start_windows.bat` بعد تثبيت Node.js 24 او احدث. او يستخدم الطرفية:

```sh
git clone YOUR_REPOSITORY_URL
cd IMC-Industrial-Challenges
node seed.mjs
npm start
```

ثم يفتح http://localhost:3000. بيانات الدخول المحلية موجودة في README. كل شخص يشغل المشروع محليا تكون له قاعدة بيانات مستقلة.

## الكود والرابط المباشر

الرفع على GitHub يشارك الكود، لكنه لا ينشر خادم التطبيق. GitHub Pages استضافة لملفات ثابتة؛ رفع مجلد `public` وحده لن يشغل تسجيل الدخول او قاعدة البيانات او المرفقات. الرابط المشترك يحتاج خادم Node.js وتخزينا دائما لقاعدة SQLite والمرفقات. اعداد الاستضافة خطوة مستقلة عن هذا الـ Push.

المراجع:

- https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
