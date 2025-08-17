# VPN Bot - سیستم کامل فروش VPN

یک سیستم حرفه‌ای و امن برای فروش VPN از طریق ربات تلگرام و پنل تحت وب با قابلیت اتصال به پنل‌های Marzban.

## 🌟 ویژگی‌ها

### 🤖 ربات تلگرام
- **فروش خودکار VPN**: کاربران می‌توانند مستقیماً از طریق ربات VPN خریداری کنند
- **پشتیبانی از روش‌های پرداخت متعدد**: کارت به کارت، ارز دیجیتال، زرین‌پال
- **مدیریت اشتراک**: مشاهده، تمدید و مدیریت VPN های فعال
- **پشتیبانی 24/7**: سیستم پشتیبانی خودکار و دستی
- **امنیت بالا**: احراز هویت دو مرحله‌ای و رمزنگاری پیشرفته

### 🖥️ پنل تحت وب
- **داشبورد مدیریتی**: آمار فروش، کاربران و سیستم
- **مدیریت پنل‌های Marzban**: اضافه، ویرایش و حذف پنل‌ها
- **مدیریت پلن‌ها**: ایجاد و مدیریت پلن‌های VPN
- **گزارش‌گیری**: گزارش‌های تفصیلی فروش و کاربران
- **مدیریت کاربران**: کنترل کامل بر کاربران و اشتراک‌ها

### 🔐 امنیت
- **احراز هویت JWT**: توکن‌های امن و قابل اعتماد
- **رمزنگاری داده**: رمزنگاری AES-256 برای داده‌های حساس
- **Rate Limiting**: محافظت در برابر حملات DDoS
- **Validation**: اعتبارسنجی کامل ورودی‌ها
- **Audit Logs**: ثبت کامل تمام فعالیت‌ها

### 💳 سیستم پرداخت
- **کارت به کارت**: پرداخت مستقیم بانکی
- **ارز دیجیتال**: پشتیبانی از Bitcoin و سایر ارزها
- **زرین‌پال**: درگاه پرداخت آنلاین ایرانی
- **تایید خودکار**: تایید خودکار پرداخت‌ها
- **گزارش مالی**: گزارش‌های کامل مالی و حسابداری

## 🚀 نصب و راه‌اندازی

### پیش‌نیازها
- سرور لینوکس (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- حداقل 1GB RAM
- حداقل 5GB فضای دیسک
- دامنه با SSL (برای تولید)

### نصب خودکار
```bash
# دانلود اسکریپت نصب
wget https://raw.githubusercontent.com/yourusername/vpn-bot/main/install.sh

# اجرای اسکریپت
chmod +x install.sh
./install.sh
```

### نصب دستی
```bash
# 1. کلون کردن پروژه
git clone https://github.com/yourusername/vpn-bot.git
cd vpn-bot

# 2. نصب وابستگی‌ها
cd backend && npm install
cd ../frontend && npm install

# 3. تنظیم متغیرهای محیطی
cp .env.example .env
# ویرایش فایل .env

# 4. راه‌اندازی دیتابیس
cd backend && npm run setup:db

# 5. ساخت پروژه
npm run build

# 6. اجرا
pm2 start ecosystem.config.js
```

## ⚙️ تنظیمات

### متغیرهای محیطی
```env
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vpn_bot
DB_USER=vpn_bot_user
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_IDS=123456789,987654321

# Payment Gateways
ZARINPAL_MERCHANT_ID=your_merchant_id
```

### تنظیم ربات تلگرام
1. ایجاد ربات در @BotFather
2. دریافت توکن ربات
3. تنظیم webhook
4. تنظیم دسترسی‌های ادمین

### تنظیم پنل Marzban
1. اضافه کردن پنل در پنل مدیریتی
2. تست اتصال
3. تنظیم پلن‌ها
4. فعال‌سازی فروش

## 📱 استفاده

### دستورات ربات
- `/start` - شروع ربات
- `/plans` - مشاهده پلن‌ها
- `/buy` - خرید VPN
- `/my_vpn` - VPN های فعال
- `/support` - پشتیبانی
- `/help` - راهنما

### پنل مدیریتی
- **Dashboard**: آمار کلی سیستم
- **Users**: مدیریت کاربران
- **Plans**: مدیریت پلن‌ها
- **Panels**: مدیریت پنل‌های Marzban
- **Payments**: مدیریت پرداخت‌ها
- **Settings**: تنظیمات سیستم

## 🔧 نگهداری

### دستورات مفید
```bash
# بررسی وضعیت سرویس‌ها
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# مشاهده لاگ‌ها
pm2 logs
tail -f logs/app.log

# پشتیبان‌گیری از دیتابیس
pg_dump -h localhost -U vpn_bot_user vpn_bot > backup.sql

# به‌روزرسانی سیستم
git pull origin main
npm install
npm run build
pm2 restart all
```

### مانیتورینگ
- بررسی وضعیت سرویس‌ها
- مانیتورینگ منابع سیستم
- بررسی لاگ‌های خطا
- گزارش‌گیری منظم

## 🛡️ امنیت

### بهترین شیوه‌ها
- تغییر رمزهای پیش‌فرض
- فعال‌سازی فایروال
- به‌روزرسانی منظم سیستم
- پشتیبان‌گیری منظم
- مانیتورینگ لاگ‌ها

### تنظیمات امنیتی
- HTTPS اجباری
- Rate limiting
- Validation ورودی‌ها
- رمزنگاری داده‌ها
- Audit logging

## 📊 آمار و گزارش‌ها

### گزارش‌های موجود
- **فروش**: آمار فروش روزانه، ماهانه و سالانه
- **کاربران**: رشد کاربران و فعالیت‌ها
- **پرداخت**: آمار روش‌های پرداخت
- **سیستم**: وضعیت پنل‌ها و منابع

### API Endpoints
```
GET  /api/stats/overview     - آمار کلی
GET  /api/users/stats        - آمار کاربران
GET  /api/payments/stats     - آمار پرداخت‌ها
GET  /api/plans/stats        - آمار پلن‌ها
```

## 🤝 مشارکت

### نحوه مشارکت
1. Fork کردن پروژه
2. ایجاد branch جدید
3. اعمال تغییرات
4. ارسال Pull Request

### استانداردهای کد
- استفاده از TypeScript
- رعایت ESLint rules
- نوشتن تست‌ها
- مستندسازی کد

## 📄 لایسنس

این پروژه تحت لایسنس MIT منتشر شده است. برای جزئیات بیشتر فایل [LICENSE](LICENSE) را مطالعه کنید.

## 🆘 پشتیبانی

### کانال‌های پشتیبانی
- **GitHub Issues**: برای گزارش باگ و درخواست ویژگی
- **Telegram**: @support_channel
- **Email**: support@yourdomain.com

### مستندات
- [راهنمای نصب](docs/INSTALLATION.md)
- [راهنمای استفاده](docs/USAGE.md)
- [API Reference](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🙏 تشکر

از تمام افرادی که در توسعه این پروژه مشارکت کرده‌اند تشکر می‌کنیم.

---

**نکته**: این سیستم برای استفاده تجاری طراحی شده است. لطفاً قبل از استفاده در محیط تولید، تمام تنظیمات امنیتی را بررسی کنید.
