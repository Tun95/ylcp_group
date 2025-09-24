const nodemailer = require("nodemailer");
const config = require("../../config");
const logger = require("../../config/logger");
const {
  getPasswordResetConfirmationTemplate,
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} = require("../../template/template");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.providers.email.service,
      host: config.providers.email.host,
      port: config.providers.email.port,
      secure: config.providers.email.secure,
      auth: {
        user: config.providers.email.username,
        pass: config.providers.email.password,
      },
    });

    // Verify connection on startup
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info("✅ Email transporter connection verified successfully");
    } catch (error) {
      logger.error("❌ Email transporter connection failed:", error);
    }
  }

  async sendEmail(mailOptions) {
    try {
      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`📧 Email sent successfully to ${mailOptions.to}`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to send email to ${mailOptions.to}:`, error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendVerificationEmail(email, otp, firstName) {
    const mailOptions = {
      from: `"Your App Name" <${config.providers.email.username}>`,
      to: email,
      subject: "Verify Your Account",
      html: getVerificationEmailTemplate(firstName, otp),
    };

    return await this.sendEmail(mailOptions);
  }

  async sendPasswordResetEmail(email, resetToken, firstName) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Your App Name" <${config.providers.email.username}>`,
      to: email,
      subject: "Password Reset Request",
      html: getPasswordResetEmailTemplate(firstName, resetUrl),
    };

    return await this.sendEmail(mailOptions);
  }

  async sendPasswordResetConfirmation(email, firstName) {
    const mailOptions = {
      from: `"Your App Name" <${config.providers.email.username}>`,
      to: email,
      subject: "Password Reset Successful",
      html: getPasswordResetConfirmationTemplate(firstName),
    };

    return await this.sendEmail(mailOptions);
  }
}

module.exports = new EmailService();
