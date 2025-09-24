// backend_service/models/email.service.js
const nodemailer = require("nodemailer");
const config = require("../../config");
const logger = require("../../config/logger");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: config.providers.email.service,
      auth: {
        user: config.providers.email.username,
        pass: config.providers.email.password,
      },
    });
  }

  async sendVerificationEmail(email, otp, firstName) {
    try {
      const mailOptions = {
        from: config.providers.email.username,
        to: email,
        subject: "Verify Your Account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Our Platform, ${firstName}!</h2>
            <p>Thank you for signing up. Please use the following OTP to verify your account:</p>
            <div style="background-color: #f4f4f4; padding: 10px; text-align: center; margin: 20px 0;">
              <h1 style="color: #333; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error(error, {
        service: "EmailService",
        method: "sendVerificationEmail",
        email,
      });
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken, firstName) {
    try {
      const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: config.providers.email.username,
        to: email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello ${firstName},</p>
            <p>You requested to reset your password. Click the link below to reset your password:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Reset Password
              </a>
            </div>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error(error, {
        service: "EmailService",
        method: "sendPasswordResetEmail",
        email,
      });
      throw error;
    }
  }

  async sendPasswordResetConfirmation(email, firstName) {
    try {
      const mailOptions = {
        from: config.providers.email.username,
        to: email,
        subject: "Password Reset Successful",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Successful</h2>
            <p>Hello ${firstName},</p>
            <p>Your password has been reset successfully.</p>
            <p>If you didn't perform this action, please contact our support team immediately.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset confirmation sent to ${email}`);
    } catch (error) {
      logger.error(error, {
        service: "EmailService",
        method: "sendPasswordResetConfirmation",
        email,
      });
      throw error;
    }
  }
}

module.exports = new EmailService();
