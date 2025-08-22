import { Telegraf, Context, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { logger } from '../utils/logger.js';
import { getDatabase } from '../database/connection.js';
import { MarzbanService } from '../services/marzbanService.js';
import { PaymentService } from '../services/paymentService.js';
import { UserService } from '../services/userService.js';
import { PlanService } from '../services/planService.js';
import { generateConfig } from '../utils/configGenerator.js';
import type { Express } from 'express';
import { validateTelegramWebhook } from '../middleware/telegramAuth.js';

export interface BotSession {
  state: 'idle' | 'waiting_for_panel_url' | 'waiting_for_panel_credentials' | 'selecting_plan' | 'payment_method' | 'processing_payment';
  panelUrl?: string;
  panelUsername?: string;
  panelPassword?: string;
  selectedPlanId?: string;
  paymentMethod?: string;
}

export interface BotContext extends Context {
  session?: BotSession;
}

class TelegramBot {
  private bot: Telegraf<BotContext>;
  private marzbanService: MarzbanService;
  private paymentService: PaymentService;
  private userService: UserService;
  private planService: PlanService;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new Telegraf<BotContext>(token);
    this.marzbanService = new MarzbanService();
    this.paymentService = new PaymentService();
    this.userService = new UserService();
    this.planService = new PlanService();

    this.setupMiddleware();
    this.setupCommands();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    // Session middleware
    this.bot.use(session());
    
    // Authentication middleware for admin commands
    this.bot.use(async (ctx, next) => {
      if (ctx.message && 'text' in ctx.message) {
        const text = ctx.message.text;
        if (text?.startsWith('/admin')) {
          const isAdmin = await this.checkAdminStatus(ctx.from?.id);
          if (!isAdmin) {
            return ctx.reply('❌ شما دسترسی ادمین ندارید!');
          }
        }
      }
      return next();
    });
  }

  private setupCommands() {
    // Start command
    this.bot.start(async (ctx) => {
      const welcomeMessage =
        '<b>🎉 به ربات فروش VPN خوش آمدید!</b>\n\n' +
        '🔐 این ربات به شما امکان خرید VPN با کیفیت بالا را می‌دهد.\n\n' +
        '<b>منوی اصلی:</b>\n' +
        '• مشاهده پلن‌ها\n' +
        '• خرید VPN\n' +
        '• VPN های من\n' +
        '• پشتیبانی';

      // Persistent reply keyboard (Main menu)
      const mainMenu = {
        reply_markup: {
          keyboard: [
            [{ text: '📋 مشاهده پلن‌ها' }, { text: '🛒 خرید VPN' }],
            [{ text: '🔐 VPN های من' }, { text: '🆘 پشتیبانی' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        },
        parse_mode: 'HTML' as const
      };

      await ctx.reply(welcomeMessage, mainMenu);
      
      // Initialize user in database
      if (ctx.from) {
        await this.userService.initializeUser(ctx.from.id, ctx.from.username || '');
      }
    });

    // Help command
    this.bot.help(async (ctx) => {
      const helpMessage =
        '<b>📚 راهنمای استفاده از ربات</b>\n\n' +
        '🛒 خرید VPN:\n' +
        '1️⃣ مشاهده پلن‌ها\n' +
        '2️⃣ انتخاب و خرید\n' +
        '3️⃣ پرداخت\n' +
        '4️⃣ دریافت کانفیگ\n\n' +
        '📱 مدیریت VPN:\n' +
        '• VPN های فعال\n' +
        '• تمدید اشتراک\n\n' +
        '🔧 ادمین:\n' +
        '• مدیریت پنل‌ها، پلن‌ها، کاربران و آمار\n\n' +
        '📞 پشتیبانی';

      await ctx.reply(helpMessage, { parse_mode: 'HTML' });
    });

    // Plans command
    this.bot.command('plans', async (ctx) => {
      try {
        const plans = await this.planService.getActivePlans();
        
        if (plans.length === 0) {
          return ctx.reply('❌ در حال حاضر هیچ پلنی موجود نیست.');
        }

        const keyboard = {
          inline_keyboard: plans.map(plan => ([
            { text: `🛒 ${plan.name}`, callback_data: `select_plan:${plan.id}` },
            { text: `💰 ${plan.price.toLocaleString()} تومان`, callback_data: `noop` }
          ]))
        };

        await ctx.reply('<b>📋 پلن‌های موجود</b>\n\nیکی از پلن‌ها را انتخاب کنید:', {
          reply_markup: keyboard,
          parse_mode: 'HTML'
        } as any);
      } catch (error) {
        logger.error('Error fetching plans:', error);
        await ctx.reply('❌ خطا در دریافت پلن‌ها. لطفاً دوباره تلاش کنید.');
      }
    });

    // Buy command
    this.bot.command('buy', async (ctx) => {
      try {
        const plans = await this.planService.getActivePlans();
        
        if (plans.length === 0) {
          return ctx.reply('❌ در حال حاضر هیچ پلنی موجود نیست.');
        }

        // Create inline keyboard for plan selection
        const keyboard = {
          inline_keyboard: plans.map(plan => ([
            { text: `🛒 ${plan.name}`, callback_data: `select_plan:${plan.id}` },
            { text: `💰 ${plan.price.toLocaleString()} تومان`, callback_data: 'noop' }
          ]))
        };

        await ctx.reply('<b>🎯 لطفاً پلن مورد نظر خود را انتخاب کنید:</b>', {
          reply_markup: keyboard,
          parse_mode: 'HTML'
        } as any);
      } catch (error) {
        logger.error('Error in buy command:', error);
        await ctx.reply('❌ خطا در نمایش پلن‌ها. لطفاً دوباره تلاش کنید.');
      }
    });

    // My VPN command
    this.bot.command('my_vpn', async (ctx) => {
      if (!ctx.from) return;
      
      try {
        const user = await this.userService.getUserByTelegramId(ctx.from.id);
        if (!user) {
          return ctx.reply('❌ کاربری یافت نشد. لطفاً /start را اجرا کنید.');
        }

        const activeSubscriptions = await this.userService.getActiveSubscriptions(user.id);
        
        if (activeSubscriptions.length === 0) {
          return ctx.reply('❌ شما هیچ VPN فعالی ندارید.');
        }

        let message = '🔐 VPN های فعال شما:\n\n';
        
        for (const sub of activeSubscriptions) {
          const plan = await this.planService.getPlanById(sub.planId);
          const panel = await this.marzbanService.getPanelById(plan.panelId);
          
          message += `
🔸 ${plan.name}
📊 حجم باقی‌مانده: ${sub.remainingData} GB
⏰ انقضا: ${new Date(sub.expiresAt).toLocaleDateString('fa-IR')}
🌐 سرور: ${panel?.name || 'نامشخص'}
          `;
        }
        
        await ctx.reply(message);
      } catch (error) {
        logger.error('Error in my_vpn command:', error);
        await ctx.reply('❌ خطا در دریافت اطلاعات VPN. لطفاً دوباره تلاش کنید.');
      }
    });

    // Support command
    this.bot.command('support', async (ctx) => {
      const supportTelegram = process.env.SUPPORT_TELEGRAM || '@RezoraHub';
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@yourdomain.com';
      const supportMessage =
        '<b>📞 پشتیبانی</b>\n\n' +
        `🔗 کانال تلگرام: ${supportTelegram}\n` +
        `📧 ایمیل: ${supportEmail}\n\n` +
        '⏰ ساعات کاری: 9 صبح تا 9 شب';

      await ctx.reply(supportMessage, { parse_mode: 'HTML' });
    });

    // Admin commands
    this.bot.command('admin_panels', async (ctx) => {
      await this.handleAdminPanels(ctx);
    });

    this.bot.command('admin_plans', async (ctx) => {
      await this.handleAdminPlans(ctx);
    });

    this.bot.command('admin_stats', async (ctx) => {
      await this.handleAdminStats(ctx);
    });

    this.bot.command('admin_users', async (ctx) => {
      await this.handleAdminUsers(ctx);
    });

    // Add panel (admin only)
    this.bot.command('add_panel', async (ctx) => {
      const isAdmin = await this.checkAdminStatus(ctx.from?.id);
      if (!isAdmin) return ctx.reply('❌ شما دسترسی ادمین ندارید!');

      ctx.session = { state: 'waiting_for_panel_url' };
      await ctx.reply('🌐 لطفاً آدرس پنل Marzban را ارسال کنید (مثال: https://panel.example.com)');
    });
  }

  private setupHandlers() {
    // Handle callback queries
    this.bot.on('callback_query', async (ctx) => {
      try {
        const data = ctx.callbackQuery.data;
        
        if (data === 'noop') {
          // do nothing; used for visual grouping
          return;
        } else if (data?.startsWith('select_plan:')) {
          const planId = data.split(':')[1];
          await this.handlePlanSelection(ctx, planId);
        } else if (data?.startsWith('payment_method:')) {
          const method = data.split(':')[1];
          await this.handlePaymentMethodSelection(ctx, method);
        } else if (data === 'back:plans') {
          await ctx.deleteMessage().catch(() => {});
          await (this.bot as any).commands.get('buy')?.(ctx);
        } else if (data?.startsWith('confirm_payment:')) {
          const paymentId = data.split(':')[1];
          await this.handlePaymentConfirmation(ctx, paymentId);
        }
        
        await ctx.answerCbQuery();
      } catch (error) {
        logger.error('Error handling callback query:', error);
        await ctx.answerCbQuery('❌ خطا در پردازش درخواست');
      }
    });

    // Handle text messages
    this.bot.on(message('text'), async (ctx) => {
      try {
        const text = ctx.message.text;
        // Map main menu buttons to commands
        if (text === '📋 مشاهده پلن‌ها') {
          return (this.bot as any).commands.get('plans')?.(ctx);
        }
        if (text === '🛒 خرید VPN') {
          return (this.bot as any).commands.get('buy')?.(ctx);
        }
        if (text === '🔐 VPN های من') {
          return (this.bot as any).commands.get('my_vpn')?.(ctx);
        }
        if (text === '🆘 پشتیبانی') {
          return (this.bot as any).commands.get('support')?.(ctx);
        }
        
        if (ctx.session?.state === 'waiting_for_panel_url') {
          await this.handlePanelUrlInput(ctx, text);
        } else if (ctx.session?.state === 'waiting_for_panel_credentials') {
          await this.handlePanelCredentialsInput(ctx, text);
        }
      } catch (error) {
        logger.error('Error handling text message:', error);
        await ctx.reply('❌ خطا در پردازش پیام. لطفاً دوباره تلاش کنید.');
      }
    });
  }

  private async handlePlanSelection(ctx: BotContext, planId: string) {
    try {
      const plan = await this.planService.getPlanById(planId);
      if (!plan) {
        return ctx.reply('❌ پلن مورد نظر یافت نشد.');
      }

      ctx.session = {
        ...ctx.session,
        state: 'payment_method',
        selectedPlanId: planId
      };

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💳 کارت به کارت', callback_data: 'payment_method:card' },
            { text: '💰 ارز دیجیتال', callback_data: 'payment_method:crypto' }
          ],
          [
            { text: '🏦 زرین‌پال', callback_data: 'payment_method:zarinpal' },
            { text: '↩️ بازگشت', callback_data: 'back:plans' }
          ]
        ]
      };

      await ctx.reply(
        `<b>🎯 پلن انتخاب شده:</b> ${plan.name}\n<b>💰 قیمت:</b> ${plan.price.toLocaleString()} تومان\n\n<b>💳 روش پرداخت را انتخاب کنید:</b>`,
        { reply_markup: keyboard, parse_mode: 'HTML' }
      );
    } catch (error) {
      logger.error('Error handling plan selection:', error);
      await ctx.reply('❌ خطا در انتخاب پلن. لطفاً دوباره تلاش کنید.');
    }
  }

  private async handlePaymentMethodSelection(ctx: BotContext, method: string) {
    try {
      const planId = ctx.session?.selectedPlanId;
      if (!planId) {
        return ctx.reply('❌ پلن انتخاب نشده. لطفاً دوباره /buy را اجرا کنید.');
      }

      const plan = await this.planService.getPlanById(planId);
      if (!plan) {
        return ctx.reply('❌ پلن مورد نظر یافت نشد.');
      }

      // Create payment record
      const payment = await this.paymentService.createPayment({
        userId: ctx.from!.id.toString(),
        planId,
        amount: plan.price,
        method,
        status: 'pending'
      });

      let paymentMessage = '';
      let keyboard = {} as any;

      switch (method) {
        case 'card': {
          const cardNumber = process.env.BANK_CARD_NUMBER || 'SET_CARD_NUMBER_IN_ENV';
          const cardHolder = process.env.BANK_CARD_HOLDER || 'SET_CARD_HOLDER_IN_ENV';
          paymentMessage = `
💳 پرداخت کارت به کارت:

🏦 شماره کارت: ${cardNumber}
👤 به نام: ${cardHolder}
💰 مبلغ: ${plan.price.toLocaleString()} تومان
📝 شماره پیگیری: ${payment.id}

✅ پس از پرداخت، رسید را ارسال کنید.
          `;
          keyboard = {
            inline_keyboard: [[
              { text: '✅ پرداخت انجام شد', callback_data: `confirm_payment:${payment.id}` }
            ]]
          };
          break;
        }

        case 'crypto': {
          const usdtAddress = process.env.CRYPTO_USDT_TRC20_ADDRESS || 'SET_USDT_TRC20_ADDRESS_IN_ENV';
          paymentMessage = `
💰 پرداخت ارز دیجیتال (USDT-TRC20):

🔗 آدرس کیف پول: ${usdtAddress}
💰 مبلغ معادل: ${plan.price.toLocaleString()} تومان (معادل USDT را محاسبه و ارسال کنید)
📝 شماره پیگیری: ${payment.id}

✅ پس از پرداخت، هش تراکنش را ارسال کنید.
          `;
          keyboard = {
            inline_keyboard: [[
              { text: '✅ پرداخت انجام شد', callback_data: `confirm_payment:${payment.id}` }
            ]]
          };
          break;
        }

        case 'zarinpal':
          const zarinpalUrl = await this.paymentService.createZarinPalPayment(payment.id, plan.price);
          paymentMessage = `
🏦 پرداخت از طریق زرین‌پال:

🔗 لینک پرداخت: ${zarinpalUrl}
💰 مبلغ: ${plan.price.toLocaleString()} تومان
📝 شماره پیگیری: ${payment.id}

✅ روی لینک بالا کلیک کنید و پرداخت را انجام دهید.
          `;
          keyboard = {
            inline_keyboard: [[
              { text: '🔗 پرداخت', url: zarinpalUrl }
            ], [
              { text: '✅ پرداخت انجام شد', callback_data: `confirm_payment:${payment.id}` }
            ]]
          };
          break;
      }

      await ctx.reply(paymentMessage, { reply_markup: keyboard });
    } catch (error) {
      logger.error('Error handling payment method selection:', error);
      await ctx.reply('❌ خطا در انتخاب روش پرداخت. لطفاً دوباره تلاش کنید.');
    }
  }

  private async handlePaymentConfirmation(ctx: BotContext, paymentId: string) {
    try {
      const payment = await this.paymentService.getPaymentById(paymentId);
      if (!payment) {
        return ctx.reply('❌ پرداخت یافت نشد.');
      }

      if (payment.status !== 'pending') {
        return ctx.reply('❌ این پرداخت قبلاً پردازش شده است.');
      }

      // Update payment status
      await this.paymentService.updatePaymentStatus(paymentId, 'completed');

      // Create VPN subscription
      const plan = await this.planService.getPlanById(payment.planId);
      const subscription = await this.userService.createSubscription({
        userId: payment.userId,
        planId: payment.planId,
        expiresAt: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
        dataLimit: plan.dataLimit
      });

      // Generate VPN config
      const config = await generateConfig(subscription.id, plan.panelId);

      await ctx.reply(
        `🎉 پرداخت با موفقیت انجام شد!\n\n🔐 VPN شما آماده است:\n\n${config}\n\n📱 این کانفیگ را در اپلیکیشن VPN خود وارد کنید.`
      );

      // Reset session
      ctx.session = { state: 'idle' };

    } catch (error) {
      logger.error('Error handling payment confirmation:', error);
      await ctx.reply('❌ خطا در تایید پرداخت. لطفاً با پشتیبانی تماس بگیرید.');
    }
  }

  private async handlePanelUrlInput(ctx: BotContext, text: string) {
    try {
      const url = text.trim();
      if (!/^https?:\/\//i.test(url)) {
        return ctx.reply('❌ آدرس معتبر نیست. لطفاً با http/https ارسال کنید.');
      }

      ctx.session = { ...(ctx.session || { state: 'idle' }), state: 'waiting_for_panel_credentials', panelUrl: url };
      await ctx.reply('👤 لطفاً نام‌کاربری و رمز عبور پنل را به صورت "username password" ارسال کنید.');
    } catch (error) {
      logger.error('Error in handlePanelUrlInput:', error);
      await ctx.reply('❌ خطا در دریافت آدرس پنل.');
      ctx.session = { state: 'idle' };
    }
  }

  private async handlePanelCredentialsInput(ctx: BotContext, text: string) {
    try {
      if (!ctx.session?.panelUrl) {
        ctx.session = { state: 'idle' };
        return ctx.reply('❌ ابتدا دستور /add_panel را اجرا کنید.');
      }

      const parts = text.trim().split(/\s+/);
      if (parts.length < 2) {
        return ctx.reply('❌ فرمت نادرست. مثال: admin VeryStrongPassword');
      }

      const [username, ...rest] = parts;
      const password = rest.join(' ');

      // Test connection
      const ok = await this.marzbanService.testPanelConnection(ctx.session.panelUrl, username, password);
      if (!ok) {
        return ctx.reply('❌ اتصال به پنل ناموفق بود. لطفاً آدرس/اطلاعات ورود را بررسی کنید.');
      }

      // Create panel
      const created = await this.marzbanService.createPanel({
        name: new URL(ctx.session.panelUrl).host,
        url: ctx.session.panelUrl,
        username,
        password
      });

      await ctx.reply(`✅ پنل با موفقیت اضافه شد:\n🌐 ${created.name} (${created.url})`);
      ctx.session = { state: 'idle' };
    } catch (error) {
      logger.error('Error in handlePanelCredentialsInput:', error);
      await ctx.reply('❌ خطا در ذخیره پنل.');
      ctx.session = { state: 'idle' };
    }
  }

  private async handleAdminPanels(ctx: BotContext) {
    try {
      const panels = await this.marzbanService.getAllPanels();
      
      let message = '🔧 مدیریت پنل‌ها:\n\n';
      
      for (const panel of panels) {
        message += `
🔸 ${panel.name}
🌐 ${panel.url}
📊 وضعیت: ${panel.status === 'connected' ? '✅ متصل' : '❌ قطع'}
        `;
      }
      
      message += '\n💡 برای اضافه کردن پنل جدید، /add_panel را اجرا کنید.';
      
      await ctx.reply(message);
    } catch (error) {
      logger.error('Error in admin panels:', error);
      await ctx.reply('❌ خطا در دریافت اطلاعات پنل‌ها.');
    }
  }

  private async handleAdminPlans(ctx: BotContext) {
    try {
      const plans = await this.planService.getAllPlans();
      
      let message = '📋 مدیریت پلن‌ها:\n\n';
      
      for (const plan of plans) {
        const panel = await this.marzbanService.getPanelById(plan.panelId);
        message += `
🔸 ${plan.name}
💰 ${plan.price.toLocaleString()} تومان
📊 ${plan.dataLimit} GB
⏰ ${plan.duration} روز
🌐 ${panel?.name || 'نامشخص'}
        `;
      }
      
      message += '\n💡 برای اضافه کردن پلن جدید، /add_plan را اجرا کنید.';
      
      await ctx.reply(message);
    } catch (error) {
      logger.error('Error in admin plans:', error);
      await ctx.reply('❌ خطا در دریافت اطلاعات پلن‌ها.');
    }
  }

  private async handleAdminStats(ctx: BotContext) {
    try {
      const stats = await this.paymentService.getSalesStats();
      
      const message = `
📊 آمار فروش:

💰 کل فروش: ${stats.totalSales.toLocaleString()} تومان
📈 تعداد فروش: ${stats.totalOrders}
📅 امروز: ${stats.todaySales.toLocaleString()} تومان
📅 این ماه: ${stats.monthSales.toLocaleString()} تومان
👥 کاربران فعال: ${stats.activeUsers}
      `;
      
      await ctx.reply(message);
    } catch (error) {
      logger.error('Error in admin stats:', error);
      await ctx.reply('❌ خطا در دریافت آمار.');
    }
  }

  private async handleAdminUsers(ctx: BotContext) {
    try {
      const users = await this.userService.getAllUsers();
      
      let message = '👥 مدیریت کاربران:\n\n';
      
      for (const user of users.slice(0, 10)) { // Show first 10 users
        message += `
👤 ${user.telegramUsername || 'نامشخص'}
🆔 ${user.telegramId}
📅 عضویت: ${new Date(user.createdAt).toLocaleDateString('fa-IR')}
        `;
      }
      
      if (users.length > 10) {
        message += `\n... و ${users.length - 10} کاربر دیگر`;
      }
      
      await ctx.reply(message);
    } catch (error) {
      logger.error('Error in admin users:', error);
      await ctx.reply('❌ خطا در دریافت اطلاعات کاربران.');
    }
  }

  private async checkAdminStatus(telegramId?: number): Promise<boolean> {
    if (!telegramId) return false;
    
    try {
      const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || [];
      return adminIds.includes(telegramId);
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  private setupErrorHandling() {
    this.bot.catch((err, ctx) => {
      logger.error('Bot error:', err);
      ctx.reply('❌ خطایی رخ داده است. لطفاً دوباره تلاش کنید.');
    });
  }

  public async launch() {
    try {
      await this.bot.launch();
      logger.info('Telegram bot launched successfully');
    } catch (error) {
      logger.error('Failed to launch bot:', error);
      throw error;
    }
  }

  public async stop() {
    try {
      await this.bot.stop();
      logger.info('Telegram bot stopped successfully');
    } catch (error) {
      logger.error('Failed to stop bot:', error);
      throw error;
    }
  }

  public getBot() {
    return this.bot;
  }
}

export const initializeBot = async (app?: Express): Promise<Telegraf<BotContext>> => {
  const bot = new TelegramBot();

  const useWebhook = !!(app && process.env.APP_URL && process.env.TELEGRAM_WEBHOOK_SECRET);
  if (useWebhook) {
    const appUrl = process.env.APP_URL as string;
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET as string;

    await bot.getBot().telegram.setWebhook(`${appUrl}/webhook/telegram`, {
      secret_token: secretToken
    });

    // Mount webhook handler
    app!.post('/webhook/telegram', validateTelegramWebhook, (req, res) => {
      bot.getBot().handleUpdate(req.body, res);
    });

    logger.info('Telegram bot configured to use webhook', { appUrl });
  } else {
    await bot.launch();
    logger.info('Telegram bot launched in long polling mode');
  }

  return bot.getBot();
};

export default TelegramBot;
