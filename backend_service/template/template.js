// backend_service/template/template.js

const config = require("../config");

// Email templates
const getVerificationEmailTemplate = (firstName, otp) => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .otp { background: #e9ecef; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Account</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${firstName}!</h2>
            <p>Thank you for signing up. Please use the following OTP to verify your account:</p>
            <div class="otp">${otp}</div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${
    config.webName
  }. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

const getPasswordResetEmailTemplate = (firstName, resetUrl) => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>You requested to reset your password. Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${
    config.webName
  }. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

const getPasswordResetConfirmationTemplate = (firstName) => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Successful</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Your password has been reset successfully.</p>
            <p>If you didn't perform this action, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${
    config.webName
  }. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

module.exports = {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordResetConfirmationTemplate,
};
