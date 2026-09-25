import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { EmailOptions, EmailServiceInterface } from '../types';

class NodemailerEmailService implements EmailServiceInterface {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
    });
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      logger.info({ to: options.to, subject: options.subject }, 'Email sent');
    } catch (error) {
      logger.error({ error, to: options.to }, 'Email send failed');
      throw error;
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

export const emailTemplates = {
  verificationEmail(name: string, verifyUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h1 style="color: #6c63ff;">Coding World</h1>
    <h2>Verify your email address</h2>
    <p>Hi ${name},</p>
    <p>Thank you for registering. Please verify your email by clicking the button below:</p>
    <a href="${verifyUrl}" style="display:inline-block;background:#6c63ff;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
      Verify Email
    </a>
    <p>This link expires in 24 hours.</p>
    <p>If you didn't create this account, you can ignore this email.</p>
  </div>
</body>
</html>`;
  },

  welcomeEmail(name: string, loginUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Coding World</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h1 style="color: #6c63ff;">Welcome to Coding World! 🚀</h1>
    <p>Hi ${name},</p>
    <p>Your account is verified and ready. Start your coding journey today!</p>
    <a href="${loginUrl}" style="display:inline-block;background:#6c63ff;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
      Start Learning
    </a>
  </div>
</body>
</html>`;
  },

  forgotPasswordEmail(name: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your password</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h1 style="color: #6c63ff;">Coding World</h1>
    <h2>Reset your password</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below:</p>
    <a href="${resetUrl}" style="display:inline-block;background:#6c63ff;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
      Reset Password
    </a>
    <p>This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
  </div>
</body>
</html>`;
  },

  passwordChangedEmail(name: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Password Changed</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h1 style="color: #6c63ff;">Coding World</h1>
    <p>Hi ${name},</p>
    <p>Your password was successfully changed. If this wasn't you, contact support immediately.</p>
  </div>
</body>
</html>`;
  },

  courseEnrollmentEmail(name: string, courseTitle: string, courseUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Enrollment Confirmed</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h1 style="color: #6c63ff;">Coding World</h1>
    <h2>You're enrolled! 🎉</h2>
    <p>Hi ${name},</p>
    <p>You've successfully enrolled in <strong>${courseTitle}</strong>.</p>
    <a href="${courseUrl}" style="display:inline-block;background:#6c63ff;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
      Start Course
    </a>
  </div>
</body>
</html>`;
  },

  paymentReceiptEmail(name: string, orderNumber: string, amount: string, items: string[]): string {
    const itemsList = items.map((i) => `<li>${i}</li>`).join('');
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payment Receipt</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h1 style="color: #6c63ff;">Coding World</h1>
    <h2>Payment Receipt</h2>
    <p>Hi ${name},</p>
    <p>Order <strong>#${orderNumber}</strong> — ₹${amount}</p>
    <ul>${itemsList}</ul>
    <p>Thank you for your purchase!</p>
  </div>
</body>
</html>`;
  },

  certificateEmail(name: string, courseTitle: string, certificateUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Course Certificate</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
    <h1 style="color: #6c63ff;">Coding World</h1>
    <h2>Congratulations! 🏆</h2>
    <p>Hi ${name},</p>
    <p>You've completed <strong>${courseTitle}</strong>. Download your certificate below:</p>
    <a href="${certificateUrl}" style="display:inline-block;background:#6c63ff;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0;">
      Download Certificate
    </a>
  </div>
</body>
</html>`;
  },
};

export const emailService = new NodemailerEmailService();
