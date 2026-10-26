<div align="center">

# 🏛️ الحوض الهادي للإسكان | Al Hawd Al Hadi
### المنصة العقارية الفاخرة ولوحة إدارة المحتوى المعمارية المتطورة
**Luxury Architectural Real Estate Platform & Dynamic CMS Dashboard**

---

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge&logo=statuspage)](https://github.com/BaderDamra/AlHawdAlHadi)
[![Version](https://img.shields.io/badge/Version-2.5.0-gold?style=for-the-badge&color=D5B277)](https://github.com/BaderDamra/AlHawdAlHadi)
[![License](https://img.shields.io/badge/License-Proprietary-blue?style=for-the-badge)](https://github.com/BaderDamra/AlHawdAlHadi)
[![Dark/Light Mode](https://img.shields.io/badge/Theme-Light%20%7C%20Dark-1F2937?style=for-the-badge&logo=color-switch)](https://github.com/BaderDamra/AlHawdAlHadi)
[![Responsive](https://img.shields.io/badge/Design-100%25%20Responsive-orange?style=for-the-badge&logo=responsive)](https://github.com/BaderDamra/AlHawdAlHadi)

<br/>

![Al Hawd Al Hadi Real Estate Platform](Luxury%20Arabic%20Real%20Estate%20Showcase.png)

</div>

<br/>

## 📖 نبذة عن المشروع (About The Project)

منصة **«الحوض الهادي للإسكان»** هي نظام ويب متكامل ومصمم خصيصاً للشركات العقارية والمطورين العقاريين الراغبين في تقديم تجربة مستخدم رقمية تليق بالمشاريع السكنية الفاخرة. 

تجمع المنصة بين **واجهة أمامية تفاعلية بصرية فائقة الأناقة** تدعم الوضعين النهاري والليلي بالكامل، وبين **لوحة تحكم CMS داخلية مرنة** تتيح إدارة وتعديل كافة محتويات الموقع، المشاريع، الشقق، المخططات الهندسية، المرافق، ومعارض الصور بدون الحاجة لكتابة كود برمجي.

---

## ✨ المميزات الرئيسية (Core Features)

### 🎨 1. تجربة بصرية ومعمارية فاخرة (Luxury Architectural UX)
* **دعم الوضع النهاري والليلي (Light & Dark Mode)**: تبديل سلس مع تناغم كامل للألوان الفاخرة (درجات الكريمي الملكي والذهبي والأسود الأوبسيديان).
* **خطوط عربية احترافية**: اعتماد خط `IBM Plex Sans Arabic` بتنسيق طباعي دقيق مع دعم كامل للغة العربية (RTL).
* **أيقونات هندسية فورمال 100%**: استبدال كافة الإيموجيز بأيقونات متجهة نقية (Formal Architectural Line SVGs).
* **تصميم متجاوب بالكامل**: أداء سلس على شاشات الجوال، الأجهزة اللوحية، والشاشات العريضة بدقة 4K.

### 🏢 2. سكشن استكشف وحدتك السكنية (Interactive Units Showcase)
* **تصفية فورية حسب الفئات**: شقق، دوبلكس، بنتهاوس.
* **بطاقات الوحدات السكنية التفاعلية**: استعراض مخطط الشقة (Floor Plan)، المساحة، عدد الغرف، والإطلالة.
* **مؤشرات ملخصة لحظية**: شريط المؤشرات الأربعة (المساحة الإجمالية، عدد الغرف، نوع الإطلالة، مستوى التشطيب).
* **انتقال سلس للمعاينات**: تحديث فوري للصورة البانورامية والشارة التوضيحية عند النقر على أي نموذج.

### 🛋️ 3. تفاصيل الشقة ومعرض الصور الداخلي (Apartment Specs & Gallery)
* **شريط تبديل علوي بين الشقق**: استعراض سريع لجميع الشقق المتاحة (`شقة A`، `شقة B`، `شقة C`).
* **مواصفات دقيقة**: المساحة، الطابق، عدد غرف النوم، الاتجاه، والسعر.
* **أزرار المزايا الأربع**: (صالة واسعة، مطبخ حديث، تراس وبلكونة، حمامات ماستر).
* **كاروسيل للغرف الداخلية**: استعراض غرف الشقة مع خاصية التكبير ملء الشاشة (Fullscreen Lightbox).

### ⚙️ 4. لوحة تحكم المحتوى الشاملة (CMS Admin Dashboard)
* **تحكم مركزي بكل سكشن**: تعديل النصوص، العناوين، الوصف، وأزرار الإجراء (CTA).
* **إدارة المشاريع ومعارض الصور**: إضافة وتعديل وحذف المشاريع والمخططات الهندسية.
* **رفع الصور مع الضغط التلقائي السريع**: ضغط فوري للصور دون أي فقدان للجودة لضمان سرعة تحميل الموقع.
* **إدارة وتخصيص الفئات والأيقونات**: إضافة فئات سكنية ومرافق جديدة واختيار أيقوناتها الهندسية بحرية.
* **متابعة طلبات الحجز والمعاينة**: استقبال طلبات الزوار وحفظها وتصديرها.

---

## 🏗️ هيكلية المشروع (Project Architecture)

```plaintext
الحوض الهادي/
├── frontend/                               # الواجهة الأمامية للموقع
│   ├── index.html                          # الصفحة الرئيسية
│   ├── project.html                        # صفحة تفاصيل المشروع الفاخر
│   ├── admin.html                          # لوحة تحكم إدارة المحتوى (CMS Dashboard)
│   ├── css/                                # ملفات التنسيق والأنماط
│   │   ├── style.css                       # أنماط الموقع الرئيسي ونظام الألوان
│   │   ├── project.css                     # أنماط صفحة تفاصيل المشروع
│   │   └── admin.css                       # أنماط لوحة التحكم
│   ├── js/                                 # المنطق البرمجي للواجهة
│   │   ├── app.js                          # إدارة العرض والتفاعل في الصفحة الرئيسية
│   │   ├── project.js                      # إدارة عرض صفحة المشروع والمعرض
│   │   └── admin.js                        # محرك لوحة التحكم ورفع الصور والحفظ
│   └── images/                             # مكتبة الصور المعمارية عالية الدقة
│       ├── light/                          # صور الريندر للوضع النهاري
│       ├── dark/                           # صور الريندر للوضع الليلي
│       ├── projects/                       # صور المشاريع والمخططات
│       └── ui/                             # صور الواجهة التفاعلية
│
├── backend/                                # الباك إند وواجهات الـ REST API
│   └── AlHawdAlHadi.Api/
│       ├── Controllers/                    # CmsController, MediaController, BookingsController
│       ├── Data/                           # Entity Framework & DbContext
│       └── SeedData/
│           └── runtime-cms.json            # قاعدة البيانات ومحتوى الـ CMS الحي
│
├── run_server.py                           # خادم محلي خفيف الوزن ومكتفي ذاتياً (Zero-Config)
├── start.bat                               # ملف تشغيل المشروع بضغطة زر واحدة
├── دليل_التشغيل_والاستخدام.txt              # دليل التشغيل والاستخدام بالعربية
└── README.md                               # توثيق المشروع التقني
```

---

## 🚀 طريقة التشغيل السريع (Quick Start)

### الطريقة الأولى: بنقرة واحدة (One-Click Runner)
1. قم بفك الضغط عن مجلد المشروع (أو تحميله عبر Git).
2. انقر نقراً مزدوجاً على الملف:
   ```cmd
   start.bat
   ```
3. سيعمل السيرفر فوراً وسيفتح المتصفح تلقائياً على الموقع!

### الطريقة الثانية: عبر سطر الأوامر (Command Line)
تأكد من وجود **Python 3.x** على جهازك، ثم نفذ:
```bash
python run_server.py
```

### الطريقة الثالثة: عبر دوت نت (.NET Core)
```bash
cd backend/AlHawdAlHadi.Api
dotnet run
```

---

## 🌐 الروابط الرئيسية (Platform URLs)

| الصفحة / الوظيفة | الرابط المحلي (Local URL) | الوصف |
| :--- | :--- | :--- |
| **الصفحة الرئيسية** | [`http://localhost:3000`](http://localhost:3000) | واجهة الموقع مع سكشن الوحدات والأسلوب المعماري |
| **صفحة تفاصيل المشروع** | [`http://localhost:3000/project.html`](http://localhost:3000/project.html) | العرض المعماري الشامل للمشروع ومرافقه |
| **لوحة التحكم (CMS)** | [`http://localhost:3000/admin.html`](http://localhost:3000/admin.html) | إدارة المحتوى والشقق والمشاريع والصور |
| **تحكم الوحدات المباشر** | [`http://localhost:3000/admin.html?tab=explorer`](http://localhost:3000/admin.html?tab=explorer) | فتح محرر سكشن استكشف وحدتك السكنية مباشرة |

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

* **الواجهة الأمامية (Frontend)**: 
  * `HTML5` الدلالي النظيف (Semantic Markup).
  * `CSS3` مع CSS Variables لتنفيذ الـ Themes وتنسيقات الـ Grid والـ Flexbox.
  * `Vanilla JavaScript (ES6+)` عالي الأداء دون الحاجة لمكتبات ضخمة وثقيلة.
  * `Leaflet.js` لعرض الخرائط الجغرافية التفاعلية.
* **الباك إند وقاعدة البيانات (Backend & Storage)**:
  * خادم بايثون مدمج عالي الكفاءة (`run_server.py`) لمعالجة طلبات الـ REST API ورفع الملفات.
  * دعم كامل لـ `ASP.NET Core 8 Web API` مع Entity Framework Core.
  * قاعدة بيانات مبنية على `JSON Runtime Engine` لحفظ التعديلات اللحظية بدون تعقيد إعداد خوادم قواعد بيانات خارجية.
* **الأصول والرسومات (Assets & Media)**:
  * مكتبة أيقونات متجهة `SVG` حصرية ومصممة خصيصاً للمجال المعماري.
  * نظام ضغط الصور في المتصفح `Canvas-based Lossless Compression`.

---

## ☁️ النشر والاستضافة (Deployment & Hosting)

### 1. الاستضافة الثابتة (Static Web Hosting):
المجلد `/frontend` مكتفٍ ذاتياً، ويمكن ربطه ونشره مباشرة عبر:
* **Vercel**
* **Netlify**
* **GitHub Pages**
* **cPanel (Shared Hosting)**

### 2. استضافة السيرفر الكامل مع الـ CMS (Full-Stack VPS):
يمكن رفع المشروع على أي خادم سحابي (Ubuntu / Debian VPS) وتشغيله كخدمة عبر `PM2` أو `Systemd`:
```bash
# تثبيت وتشغيل كخدمة دائمة
pm2 start run_server.py --name "alhawd-platform"
pm2 save
```

---

## 👨‍💻 المطور والحقوق (Author & Credits)

* **المطور**: بدر ضمرة ([Bader Damra](https://github.com/BaderDamra))
* **المشروع**: الحوض الهادي للإسكان - Al Hawd Al Hadi Real Estate
* **المستودع الرسمي**: [https://github.com/BaderDamra/AlHawdAlHadi](https://github.com/BaderDamra/AlHawdAlHadi)

---

<div align="center">
  <sub>صُمم وطُوّر بكل فخر ليقدم أرقى تجربة رقمية في عالم التطوير والتسويق العقاري الحديث.</sub>
</div>
