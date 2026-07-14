import nodemailer from 'nodemailer';
import logger from '../helpers/logger.js';
import env from '../config/env.js';

/**
 * Email Service — sends transactional emails (welcome, notifications, etc.)
 *
 * In development mode it auto-creates an Ethereal test account so you can
 * preview emails without configuring a real SMTP provider.
 * In production (or when EMAIL_SERVICE=gmail is set) it sends through Gmail.
 * Otherwise it uses the generic SMTP settings from the environment config.
 */
const EmailService = {
  _transporter: null,
  _etherealUrl: null,
  _verified: false,

  /**
   * Check if email is properly configured (has credentials).
   */
  isConfigured() {
    return !!(env.email.user && env.email.password);
  },

  /**
   * Get or create the nodemailer transporter.
   * In dev this lazily creates an Ethereal account on first use.
   */
  async getTransporter() {
    if (this._transporter) return this._transporter;

    const isGmail = env.email.service === 'gmail' || env.email.host?.includes('gmail.com');
    const hasCredentials = this.isConfigured();

    if (hasCredentials) {
      // Use configured SMTP (Gmail or generic)
      const transportConfig = isGmail
        ? {
            service: 'gmail',
            auth: {
              user: env.email.user,
              pass: env.email.password,
            },
          }
        : {
            host: env.email.host,
            port: env.email.port,
            secure: env.email.secure,
            auth: {
              user: env.email.user,
              pass: env.email.password,
            },
          };

      this._transporter = nodemailer.createTransport(transportConfig);
      logger.info(`✅ Email transporter created (${isGmail ? 'Gmail' : 'SMTP'})`);

      // Verify transporter connection asynchronously (don't block startup)
      this._verifyConnection();
    } else if (env.nodeEnv === 'production') {
      // Production without credentials — log warning and return null
      logger.warn(
        '⚠️  Email is NOT configured. Real emails will NOT be sent.\n' +
        '   Add these to your .env file:\n' +
        '   EMAIL_SERVICE=gmail\n' +
        '   EMAIL_USER=your-email@gmail.com\n' +
        '   EMAIL_PASSWORD=your-16-char-app-password'
      );
      return null;
    } else {
      // Development: use Ethereal fake SMTP
      try {
        const testAccount = await nodemailer.createTestAccount();
        this._transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this._etherealUrl = 'https://ethereal.email/login';
        logger.warn('⚠️  Using FAKE SMTP (Ethereal) — emails will NOT reach real inboxes!');
        logger.info(`   📧 Preview emails at: ${this._etherealUrl}`);
        logger.info(`   Ethereal user: ${testAccount.user}`);
        logger.info('');
        logger.info('   🔧 To send REAL emails via Gmail, add to your .env file:');
        logger.info('   EMAIL_SERVICE=gmail');
        logger.info('   EMAIL_USER=your-email@gmail.com');
        logger.info('   EMAIL_PASSWORD=your-16-char-app-password');
        logger.info('   Then restart the backend server.');
      } catch (etherealErr) {
        logger.warn(`Failed to create Ethereal test account: ${etherealErr.message}`);
        logger.warn('   Email features will be unavailable.');
        return null;
      }
    }

    return this._transporter;
  },

  /**
   * Verify the transporter connection asynchronously.
   * Logs a warning if verification fails (e.g., bad credentials).
   */
  async _verifyConnection() {
    try {
      await this._transporter.verify();
      this._verified = true;
      logger.info('✅ Email transporter verified — ready to send emails');
    } catch (err) {
      this._verified = false;
      logger.warn(
        '⚠️  Email transporter verification FAILED. Check your credentials:\n' +
        `   ${err.message}\n` +
        '   Password reset and welcome emails will not be sent until this is fixed.'
      );
    }
  },

  /**
   * Shared HTML template wrapper with SVG icon, branding, and consistent layout.
   */
  _buildTemplate({ title, headerGradient, bodyContent }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* ---- Reset ---- */
          body, table, td, p, a { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          body {
            margin: 0; padding: 0;
            background-color: #f0f4f8;
            -webkit-font-smoothing: antialiased;
          }
          .email-wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f0f4f8;
            padding: 24px 0;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          }
          /* ---- Header ---- */
          .header {
            background: ${headerGradient};
            padding: 40px 30px 36px;
            text-align: center;
            position: relative;
          }
          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: rgba(255,255,255,0.15);
          }
          .header-logo {
            margin-bottom: 12px;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            color: rgba(255,255,255,0.85);
            margin: 8px 0 0;
            font-size: 15px;
            line-height: 1.5;
          }
          /* ---- Body ---- */
          .body {
            padding: 36px 32px;
          }
          .body h2 {
            color: #1a2027;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 12px;
          }
          .body p {
            color: #4a5568;
            line-height: 1.7;
            margin: 0 0 16px;
            font-size: 15px;
          }
          /* ---- Credentials card ---- */
          .card {
            background: #f8faff;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #1976D2;
            border-radius: 12px;
            padding: 16px 20px;
            margin: 20px 0;
          }
          .card-label {
            font-size: 12px;
            color: #8896a6;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 600;
            padding: 8px 0;
          }
          .card-value {
            font-size: 16px;
            color: #1a2027;
            font-weight: 600;
            font-family: 'Courier New', Courier, monospace;
            background: #edf2f7;
            padding: 6px 14px;
            border-radius: 6px;
            text-align: right;
          }
          /* ---- Button ---- */
          .btn-wrapper {
            text-align: center;
            margin: 28px 0 20px;
          }
          .btn {
            display: inline-block;
            padding: 14px 40px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 16px;
            text-decoration: none;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(25,118,210,0.3);
          }
          .btn-primary {
            background: linear-gradient(135deg, #1976D2, #1565C0);
          }
          .btn-warning {
            background: linear-gradient(135deg, #ED6C02, #E65100);
          }
          .btn-success {
            background: linear-gradient(135deg, #2E7D32, #1B5E20);
          }
          .btn:hover {
            opacity: 0.95;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(25,118,210,0.35);
          }
          /* ---- Divider ---- */
          .divider {
            height: 1px;
            background: #e2e8f0;
            margin: 24px 0;
          }
          /* ---- Security badge ---- */
          .security-note {
            background: #fff8f0;
            border: 1px solid #ffe0b2;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 20px 0;
            font-size: 13px;
            color: #bf6c00;
            line-height: 1.6;
          }
          .security-note strong {
            color: #e65100;
          }
          .info-note {
            background: #f0f7ff;
            border: 1px solid #bbdefb;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 16px 0;
            font-size: 13px;
            color: #1565c0;
            line-height: 1.6;
          }
          /* ---- Footer ---- */
          .footer {
            background: #f8fafc;
            padding: 28px 32px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            color: #94a3b8;
            font-size: 13px;
            margin: 4px 0;
            line-height: 1.6;
          }
          .footer-brand {
            font-size: 14px;
            font-weight: 600;
            color: #1976D2 !important;
          }
          .footer-social {
            margin: 12px 0 8px;
          }
          .footer-social a {
            display: inline-block;
            margin: 0 6px;
            text-decoration: none;
            color: #94a3b8;
            font-size: 13px;
          }
          /* ---- Responsive ---- */
          @media screen and (max-width: 480px) {
            .email-container { border-radius: 0; }
            .body { padding: 24px 20px; }
            .header { padding: 28px 20px 24px; }
            .footer { padding: 20px; }
            .header h1 { font-size: 22px; }
            .card-value { font-size: 14px; }
            .btn { display: block; padding: 14px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <div class="email-container">
                  <!-- Header -->
                  <div class="header">
                    <div class="header-logo">
                      <!-- Inline SVG Logo: Graduation Cap with Book -->
                      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="32" cy="32" r="32" fill="rgba(255,255,255,0.15)"/>
                        <path d="M16 34V28L32 18L48 28V34" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M22 31V40L32 46L42 40V31" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M32 18V30" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                        <circle cx="32" cy="36" r="3" fill="white"/>
                        <path d="M28 42L30 46H34L36 42" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                      </svg>
                    </div>
                    <h1>${title}</h1>
                  </div>

                  <!-- Body -->
                  <div class="body">
                    ${bodyContent}
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    <p class="footer-brand">🎓 Student Management System</p>
                    <div class="footer-social">
                      <a href="#">📘 Facebook</a>
                      <a href="#">🐦 Twitter</a>
                      <a href="#">📸 Instagram</a>
                      <a href="#">💼 LinkedIn</a>
                    </div>
                    <p>This is an automated message, please do not reply.</p>
                    <p style="font-size: 11px; color: #b0b8c1; margin-top: 6px;">
                      &copy; ${new Date().getFullYear()} Student Management System. All rights reserved.
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Send a password reset email with a reset link.
   */
  async sendPasswordReset({ email, fullName, resetToken, origin }) {
    try {
      const transporter = await this.getTransporter();
      const resetUrl = `${origin}/reset-password?token=${resetToken}`;

      const bodyContent = `
        <h2>Hello ${fullName},</h2>
        <p>We received a request to reset your password for your Student Management System account. Click the button below to set a new password.</p>

        <div class="btn-wrapper">
          <a href="${resetUrl}" class="btn btn-warning" style="color:#ffffff !important; text-decoration:none;">🔑 Reset Password</a>
        </div>

        <div class="divider"></div>

        <div class="info-note">
          <strong>⏰ Link Expiry:</strong> This password reset link will expire in <strong>1 hour</strong>.
        </div>

        <div class="security-note">
          <strong>🔒 Didn't request this?</strong> If you didn't request a password reset, please ignore this email or contact your system administrator if you have concerns about your account security.
        </div>

        <p style="text-align:center; font-size:13px; color:#94a3b8;">
          Having trouble clicking the button? Copy and paste this URL into your browser:<br>
          <span style="color:#1976D2; word-break:break-all;">${resetUrl}</span>
        </p>
      `;

      const info = await transporter.sendMail({
        from: env.email.from || '"Student Management" <noreply@studentmanagement.com>',
        to: email,
        subject: '🔑 Password Reset - Student Management System',
        html: this._buildTemplate({
          title: 'Reset Your Password',
          headerGradient: 'linear-gradient(135deg, #ED6C02 0%, #FF9800 50%, #FFA726 100%)',
          bodyContent,
        }),
      });

      logger.info(`Password reset email sent to ${email} — message ID: ${info.messageId}`);

      if (env.nodeEnv !== 'production') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          logger.info(`📧 Preview reset email at: ${previewUrl}`);
        }
      }

      return info;
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
    }
  },

  /**
   * Send a welcome email to a newly created student with their credentials.
   */
  async sendStudentWelcome({ email, firstName, lastName, studentId, password }) {
    try {
      const transporter = await this.getTransporter();
      const loginUrl = `${env.corsOrigin || 'http://localhost:5173'}/login`;

      const bodyContent = `
        <h2>Welcome, ${firstName} ${lastName}! 🎉</h2>
        <p>We're excited to have you on board! Your account has been successfully created in the <strong>Student Management System</strong>. Below are your login credentials — please keep them safe.</p>

        <div class="card">
          <!-- Table-based credential rows for email compatibility -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td class="card-label" width="40%" style="padding:10px 0; border-bottom:1px solid #edf2f7;">🆔 Student ID</td>
              <td class="card-value" width="60%" style="padding:10px 0; border-bottom:1px solid #edf2f7;">${studentId}</td>
            </tr>
            <tr>
              <td class="card-label" width="40%" style="padding:10px 0; border-bottom:1px solid #edf2f7;">📧 Email</td>
              <td class="card-value" width="60%" style="padding:10px 0; border-bottom:1px solid #edf2f7;">${email}</td>
            </tr>
            <tr>
              <td class="card-label" width="40%" style="padding:10px 0;">🔑 Password</td>
              <td class="card-value" width="60%" style="padding:10px 0; background:#e8f5e9; color:#2e7d32;">${password}</td>
            </tr>
          </table>
        </div>

        <div class="btn-wrapper">
          <a href="${loginUrl}" class="btn btn-primary" style="color:#ffffff !important; text-decoration:none;">🚀 Login to Your Dashboard</a>
        </div>

        <div class="divider"></div>

        <!-- Feature Icons: table-based for email compatibility -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">
          <tr>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f0f7ff; border-radius:10px;">
                <tr><td style="text-align:center; padding:16px 8px;">
                  <div style="font-size:28px; line-height:1.2;">📊</div>
                  <div style="font-size:13px; color:#4a5568; font-weight:600; margin-top:4px;">Dashboard</div>
                </td></tr>
              </table>
            </td>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f0f7ff; border-radius:10px;">
                <tr><td style="text-align:center; padding:16px 8px;">
                  <div style="font-size:28px; line-height:1.2;">📝</div>
                  <div style="font-size:13px; color:#4a5568; font-weight:600; margin-top:4px;">Courses</div>
                </td></tr>
              </table>
            </td>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f0f7ff; border-radius:10px;">
                <tr><td style="text-align:center; padding:16px 8px;">
                  <div style="font-size:28px; line-height:1.2;">👤</div>
                  <div style="font-size:13px; color:#4a5568; font-weight:600; margin-top:4px;">Profile</div>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>

        <div class="security-note">
          <strong>⚠️ Security Notice:</strong> For your safety, please change your password after your first login. If you did not create this account, please contact the system administrator immediately.
        </div>
      `;

      const info = await transporter.sendMail({
        from: env.email.from || '"Student Management System" <noreply@studentmanagement.com>',
        to: email,
        subject: '🎓 Welcome to Student Management System — Your Account Details',
        html: this._buildTemplate({
          title: 'Welcome Aboard! 🎓',
          headerGradient: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 50%, #7C4DFF 100%)',
          bodyContent,
        }),
      });

      logger.info(`Welcome email sent to ${email} — message ID: ${info.messageId}`);

      // For development (Ethereal), log the preview URL
      if (env.nodeEnv !== 'production') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          logger.info(`📧 Preview email at: ${previewUrl}`);
        }
      }

      return info;
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}: ${error.message}`);
      // Don't re-throw — parent caller (studentController) handles it with a warn log
    }
  },
};

export default EmailService;
