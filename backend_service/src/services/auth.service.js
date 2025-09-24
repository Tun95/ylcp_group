// backend_service/src/services/auth.service.js
const config = require("../../config");
const logger = require("../../config/logger");
const userModel = require("../../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("./email.service");
const { ERROR_MESSAGES } = require("../constants/constants");

class AuthService {
  // Signup
  async signup(userData) {
    try {
      // Check if user already exists
      const existingUser = await userModel.findOne({ email: userData.email });
      if (existingUser) {
        throw { code: 11000 };
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = new userModel({
        ...userData,
        password: hashedPassword,
      });

      // Generate OTP
      const otp = await user.createAccountVerificationOtp();
      await user.save();

      // Send verification email
      await emailService.sendVerificationEmail(
        user.email,
        otp,
        user.first_name
      );

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.password_reset_token;
      delete userResponse.password_reset_expires;
      delete userResponse.account_verification_otp;
      delete userResponse.account_verification_otp_expires;

      return { user: userResponse };
    } catch (error) {
      logger.error(error, {
        service: "AuthService",
        method: "signup",
        email: userData.email,
      });
      throw error;
    }
  }

  // Signin
  async signin(email, password) {
    try {
      // Find user
      const user = await userModel.findOne({ email }).select("+password");
      if (!user) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      // Check if account is verified
      if (!user.is_account_verified) {
        throw new Error(ERROR_MESSAGES.ACCOUNT_NOT_VERIFIED);
      }

      // Check password
      const isPasswordValid = await user.isPasswordMatch(password);
      if (!isPasswordValid) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error(ERROR_MESSAGES.ACCOUNT_DEACTIVATED);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Update user
      user.password_change_at = new Date();
      user.last_login = new Date();
      await user.save();

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.password_reset_token;
      delete userResponse.password_reset_expires;
      delete userResponse.account_verification_otp;
      delete userResponse.account_verification_otp_expires;

      return {
        user: userResponse,
        token,
        expiresIn: config.jwt.expiresIn,
      };
    } catch (error) {
      logger.error(error, {
        service: "AuthService",
        method: "signin",
        email,
      });
      throw error;
    }
  }

  // Verify OTP
  async verifyOtp(email, otp) {
    try {
      const user = await userModel.findOne({ email });
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Check if OTP matches and is not expired
      if (user.account_verification_otp !== otp) {
        throw new Error(ERROR_MESSAGES.INVALID_OTP);
      }

      if (user.account_verification_otp_expires < new Date()) {
        throw new Error(ERROR_MESSAGES.OTP_EXPIRED);
      }

      // Verify account
      user.is_account_verified = true;
      user.account_verification_otp = undefined;
      user.account_verification_otp_expires = undefined;
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.password_reset_token;
      delete userResponse.password_reset_expires;

      return {
        user: userResponse,
        token,
        expiresIn: config.jwt.expiresIn,
      };
    } catch (error) {
      logger.error(error, {
        service: "AuthService",
        method: "verifyOtp",
        email,
      });
      throw error;
    }
  }

  // Forgot Password
  async forgotPassword(email) {
    try {
      const user = await userModel.findOne({ email });
      if (!user) {
        // Don't reveal whether email exists or not
        return { emailSent: true };
      }

      // Generate reset token
      const resetToken = await user.createPasswordResetToken();
      await user.save();

      // Send reset email
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.first_name
      );

      return { emailSent: true };
    } catch (error) {
      logger.error(error, {
        service: "AuthService",
        method: "forgotPassword",
        email,
      });
      throw error;
    }
  }

  // Reset Password
  async resetPassword(token, newPassword) {
    try {
      // Hash the token to compare with stored hash
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const user = await userModel.findOne({
        password_reset_token: hashedToken,
        password_reset_expires: { $gt: new Date() },
      });

      if (!user) {
        throw new Error(ERROR_MESSAGES.INVALID_RESET_TOKEN);
      }

      // Hash new password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password and clear reset token
      user.password = hashedPassword;
      user.password_change_at = new Date();
      user.password_reset_token = undefined;
      user.password_reset_expires = undefined;
      await user.save();

      // Send confirmation email
      await emailService.sendPasswordResetConfirmation(
        user.email,
        user.first_name
      );

      return { passwordUpdated: true };
    } catch (error) {
      logger.error(error, {
        service: "AuthService",
        method: "resetPassword",
      });
      throw error;
    }
  }

  // Resend OTP
  async resendOtp(email) {
    try {
      const user = await userModel.findOne({ email });
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      if (user.is_account_verified) {
        throw new Error(ERROR_MESSAGES.ACCOUNT_ALREADY_VERIFIED);
      }

      // Generate new OTP
      const otp = await user.createAccountVerificationOtp();
      await user.save();

      // Send verification email
      await emailService.sendVerificationEmail(
        user.email,
        otp,
        user.first_name
      );

      return { otpSent: true };
    } catch (error) {
      logger.error(error, {
        service: "AuthService",
        method: "resendOtp",
        email,
      });
      throw error;
    }
  }
}

module.exports = new AuthService();
