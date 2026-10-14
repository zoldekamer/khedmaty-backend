# khedmaty-backend

## تشغيل المشروع

1. ثبّت الاعتماديات باستخدام `npm install`.
2. أنشئ ملف `.env` يتضمن:
   - `MONGO_URI` عنوان اتصال MongoDB.
   - `JWT_SECRET` مفتاحًا عشوائيًا قويًا وثابتًا لتوقيع رموز الدخول.
   - `PORT` اختياريًا (الافتراضي `5000`).
3. شغّل الخادم باستخدام `npm start`.
4. شغّل اختبارات المصادقة باستخدام `npm test`.

انسخ `.env.example` إلى `.env` للتطوير، واستبدل القيم النموذجية. لا ترفع `.env` إلى
المستودع؛ يستثنيه `.gitignore` عمدًا. قبل تشغيل SMS حقيقي، أضف بيانات اعتماد Twilio
إلى `.env` محليًا أو إلى مخزن أسرار منصة الاستضافة، واضبط `OTP_MODE=twilio`.

للتطوير المحلي فقط، يمكن تفعيل OTP التجريبي بإضافة `OTP_MODE=development` إلى `.env`.
يقبل هذا الوضع الرمز `1234` ولا يرسل رسالة نصية، ويُعطّل دائمًا في `NODE_ENV=production`.

لإرسال OTP فعلي عبر Twilio، اضبط `OTP_MODE=twilio` والمتغيرات `TWILIO_ACCOUNT_SID`
و`TWILIO_AUTH_TOKEN` و`TWILIO_FROM_NUMBER` في إعدادات الخادم السرية، مع رقم المستلم
بصيغة E.164 (مثل `+9627...`). الرمز عشوائي، صالح لخمس دقائق، ومحاولات التحقق محدودة
ويُحذف بعد الاستخدام. لا تضع بيانات Twilio في الواجهة أو المستودع.

يدعم الخادم بدء OAuth والتحقق من callback وتذكرة دخول أحادية الاستخدام لـ Google وFacebook.
للتفعيل، أضف إلى إعدادات الخادم السرية:

- `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` و`GOOGLE_CALLBACK_URL`.
- `FACEBOOK_APP_ID` و`FACEBOOK_APP_SECRET` و`FACEBOOK_CALLBACK_URL`.
- `FACEBOOK_GRAPH_API_VERSION` إصدار Meta Graph API؛ القيمة الافتراضية `v26.0`.
- `FRONTEND_URL` عنوان واجهة React التي ستستقبل تذكرة الدخول.
- `CORS_ORIGINS` قائمة مفصولة بفواصل بأصول الواجهات الخارجية الموثوقة، مثل
  `https://app.example.com,https://static.example.com`. لا تضف نطاقات غير موثوقة.

سجّل callback URL نفسه حرفيًا في إعدادات كل تطبيق OAuth:
`<API_PUBLIC_URL>/api/auth/oauth/google/callback` و
`<API_PUBLIC_URL>/api/auth/oauth/facebook/callback`. استخدم HTTPS في الإنتاج.
يستخدم Google البريد الموثّق لربط حساب موجود؛ لا يربط Facebook حسابًا موجودًا تلقائيًا
بالبريد. يمكن إنشاء حساب اجتماعي بلا رقم هاتف، ويطلب التطبيق رقم التواصل ضمن نموذج
طلب الخدمة عند الحاجة.

استعادة كلمة المرور متاحة للحسابات المرتبطة برقم هاتف: أرسل OTP إلى الرقم ثم استخدم
`POST /api/auth/password/reset` بكائن `{ "phoneNumber": "...", "otp": "...", "password": "..." }`.
تُخزّن كلمة المرور باستخدام scrypt، ويمكن بعدها تسجيل الدخول عبر `POST /api/auth/login`.
استعادة حساب OAuth الذي لا يملك رقم هاتف تتم لدى المزوّد نفسه.

الواجهة المستقلة `index.html` تستخدم `/api` من النطاق نفسه افتراضيًا. عند استضافتها
على نطاق منفصل، عيّن `window.KHEDMATY_API_URL` إلى عنوان API العام قبل تحميل سكربت
الصفحة، واضبط CORS على الخادم للمصدر الموثوق فقط. بيانات الطلبات والمحفظة المحلية
والصور/وثائق التحقق في هذه الواجهة لا تنتقل تلقائيًا إلى قاعدة بيانات الخادم.

## المسارات

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login` (رقم الهاتف وكلمة المرور)
- `POST /api/auth/password/reset` (رقم الهاتف ورمز OTP وكلمة المرور الجديدة)
- `PUT /api/auth/profile` (يتطلب تسجيل الدخول)
- `POST /api/auth/merchant/register` (يتطلب تسجيل الدخول)
- `GET /api/auth/oauth/google` و`GET /api/auth/oauth/facebook`
- `POST /api/auth/oauth/exchange` (تذكرة OAuth قصيرة العمر ولمرة واحدة)
- `POST /api/auth/provider/register` (يتطلب `Authorization: Bearer <token>`)
- `POST /api/requests` (يتطلب تسجيل الدخول)
- `GET /api/requests` (يتطلب تسجيل الدخول)
- مسارات `/api/admin/*` (تتطلب حساب مدير)

لإرسال SMS حقيقي، يلزم حساب Twilio فعّال، ورقم إرسال SMS مفعّل، وتعبئة `TWILIO_ACCOUNT_SID`
و`TWILIO_AUTH_TOKEN` و`TWILIO_FROM_NUMBER` في بيئة الخادم. عند غياب هذه البيانات لا
يُرسل الخادم رمزًا تجريبيًا في وضع Twilio، بل يعيد خطأ واضحًا.

## إنشاء حساب مدير

أنشئ حساب المستخدم وسجّل الدخول به أولًا، ثم امنحه صلاحية المدير يدويًا من جهاز
الخادم باستخدام `npm run create-admin -- <phone-number>`. لا يوجد تسجيل مدير عام
من واجهة التطبيق. بعد ذلك، سجّل الدخول بالحساب نفسه لفتح لوحة الإدارة.