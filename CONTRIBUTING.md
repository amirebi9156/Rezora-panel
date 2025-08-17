# راهنمای مشارکت در VPN Bot

از مشارکت شما در توسعه VPN Bot سپاسگزاریم! این سند راهنمای کاملی برای مشارکت در پروژه ارائه می‌دهد.

## 📋 فهرست مطالب

- [شروع کار](#شروع-کار)
- [نحوه مشارکت](#نحوه-مشارکت)
- [استانداردهای کدنویسی](#استانداردهای-کدنویسی)
- [تست‌ها](#تست‌ها)
- [ارسال Pull Request](#ارسال-pull-request)
- [گزارش باگ](#گزارش-باگ)
- [درخواست ویژگی](#درخواست-ویژگی)

## 🚀 شروع کار

### پیش‌نیازها

- Node.js 18+ 
- Docker & Docker Compose
- Git
- npm یا yarn

### نصب و راه‌اندازی

1. **Fork کردن پروژه**
   ```bash
   git clone https://github.com/YOUR_USERNAME/vpn-bot.git
   cd vpn-bot
   ```

2. **نصب وابستگی‌ها**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **راه‌اندازی محیط توسعه**
   ```bash
   npm run dev
   ```

4. **راه‌اندازی با Docker**
   ```bash
   npm run docker:up
   ```

## 🔧 نحوه مشارکت

### انواع مشارکت

- **گزارش باگ**: گزارش مشکلات و خطاها
- **درخواست ویژگی**: پیشنهاد ویژگی‌های جدید
- **بهبود مستندات**: بهبود README، API docs و غیره
- **کد**: پیاده‌سازی ویژگی‌ها یا رفع باگ‌ها
- **تست**: نوشتن تست‌ها یا بهبود تست‌های موجود

### فرآیند مشارکت

1. **ایجاد Issue**: ابتدا issue مربوطه را ایجاد کنید
2. **بحث و توافق**: با تیم در مورد راه‌حل صحبت کنید
3. **پیاده‌سازی**: کد را پیاده‌سازی کنید
4. **تست**: مطمئن شوید همه تست‌ها موفق هستند
5. **ارسال PR**: Pull Request ارسال کنید

## 📝 استانداردهای کدنویسی

### TypeScript

- از TypeScript 5.8+ استفاده کنید
- از `strict` mode استفاده کنید
- از `any` استفاده نکنید (مگر در موارد ضروری)
- از `interface` به جای `type` استفاده کنید (برای object shapes)

### React (Frontend)

- از Functional Components استفاده کنید
- از Hooks استفاده کنید
- از TypeScript برای props استفاده کنید
- از CSS Modules یا Styled Components استفاده کنید

### Node.js (Backend)

- از ES Modules استفاده کنید
- از async/await استفاده کنید
- از proper error handling استفاده کنید
- از logging مناسب استفاده کنید

### نام‌گذاری

- **فایل‌ها**: `kebab-case` (مثل `user-service.ts`)
- **کلاس‌ها**: `PascalCase` (مثل `UserService`)
- **توابع**: `camelCase` (مثل `getUserById`)
- **ثابت‌ها**: `UPPER_SNAKE_CASE` (مثل `MAX_RETRY_COUNT`)

### فرمت‌بندی

- از Prettier برای فرمت‌بندی استفاده کنید
- از ESLint برای linting استفاده کنید
- از EditorConfig برای تنظیمات editor استفاده کنید

## 🧪 تست‌ها

### انواع تست‌ها

- **Unit Tests**: تست توابع و کامپوننت‌ها
- **Integration Tests**: تست تعامل بین بخش‌ها
- **E2E Tests**: تست کامل کاربری

### اجرای تست‌ها

```bash
# همه تست‌ها
npm test

# تست‌های backend
npm run test:backend

# تست‌های frontend
npm run test:frontend

# تست‌های E2E
npm run test:e2e

# تست با coverage
npm run test:coverage
```

### نوشتن تست‌ها

- از Jest برای backend استفاده کنید
- از Vitest برای frontend استفاده کنید
- از Playwright برای E2E استفاده کنید
- تست‌ها باید مستقل و قابل تکرار باشند

## 🔄 ارسال Pull Request

### قبل از ارسال PR

1. **مطمئن شوید که:**
   - کد کامپایل می‌شود
   - همه تست‌ها موفق هستند
   - linting errors ندارید
   - کد فرمت شده است

2. **چک‌لیست:**
   - [ ] کد کامپایل می‌شود
   - [ ] همه تست‌ها موفق هستند
   - [ ] linting errors ندارید
   - [ ] کد فرمت شده است
   - [ ] مستندات به‌روزرسانی شده‌اند
   - [ ] تغییرات در CHANGELOG ثبت شده‌اند

### ساختار PR

```markdown
## 📝 توضیحات
توضیح مختصری از تغییرات

## 🔗 Issue
Closes #123

## 🧪 تست‌ها
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

## 📸 اسکرین‌شات (در صورت نیاز)
اضافه کردن اسکرین‌شات از تغییرات UI

## 📋 چک‌لیست
- [ ] کد کامپایل می‌شود
- [ ] همه تست‌ها موفق هستند
- [ ] linting errors ندارید
- [ ] کد فرمت شده است
- [ ] مستندات به‌روزرسانی شده‌اند
```

## 🐛 گزارش باگ

### قالب گزارش باگ

```markdown
## 🐛 توضیح باگ
توضیح واضح و مختصر از باگ

## 🔄 مراحل تکرار
1. به صفحه X بروید
2. روی Y کلیک کنید
3. خطای Z را مشاهده کنید

## 📱 اطلاعات سیستم
- OS: [مثل Windows 10]
- Browser: [مثل Chrome 120]
- Version: [مثل 1.0.0]

## 📸 اسکرین‌شات
اضافه کردن اسکرین‌شات از خطا

## 📝 اطلاعات اضافی
هر اطلاعات اضافی که ممکن است مفید باشد
```

## 💡 درخواست ویژگی

### قالب درخواست ویژگی

```markdown
## 💡 خلاصه
توضیح مختصر از ویژگی درخواستی

## 🎯 مشکل
توضیح مشکل یا محدودیتی که این ویژگی حل می‌کند

## 💭 راه‌حل پیشنهادی
توضیح راه‌حل پیشنهادی

## 🔄 جایگزین‌ها
راه‌حل‌های جایگزین (در صورت وجود)

## 📱 اطلاعات اضافی
هر اطلاعات اضافی که ممکن است مفید باشد
```

## 📚 منابع مفید

### مستندات

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

### ابزارها

- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/)
- [Jest](https://jestjs.io/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

## 🤝 تماس

- **GitHub Issues**: برای گزارش باگ و درخواست ویژگی
- **GitHub Discussions**: برای سوالات و بحث‌ها
- **Email**: [your-email@example.com]

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است. مشارکت شما به معنای موافقت با این مجوز است.

---

**سپاس از مشارکت شما در بهبود VPN Bot! 🚀**
