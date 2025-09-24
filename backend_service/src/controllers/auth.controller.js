// backend_service/src/controllers/auth.controller.js
const logger = require("../../config/logger");
const { sendResponse } = require("../utils/utils");
const { ERROR_MESSAGES, STATUS } = require("../constants/constants");
const authService = require("../services/auth.service");

class AuthController {
  // Signup
  async signup(req, res) {
    try {
      const userData = req.body;
      const result = await authService.signup(userData);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        message:
          "Account created successfully. Please check your email for verification OTP.",
        data: {
          user: result.user,
          otpSent: true,
        },
      });
    } catch (error) {
      logger.error(error, {
        controller: "AuthController",
        method: "signup",
        email: req.body.email,
      });

      if (error.code === 11000) {
        return sendResponse(res, 409, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.DUPLICATE_EMAIL,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Signin
  async signin(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.signin(email, password);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      logger.error(error, {
        controller: "AuthController",
        method: "signin",
        email: req.body.email,
      });

      const statusCode =
        error.message === ERROR_MESSAGES.INVALID_CREDENTIALS
          ? 401
          : error.message === ERROR_MESSAGES.ACCOUNT_NOT_VERIFIED
          ? 403
          : 500;

      return sendResponse(res, statusCode, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Verify OTP
  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyOtp(email, otp);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Account verified successfully",
        data: result,
      });
    } catch (error) {
      logger.error(error, {
        controller: "AuthController",
        method: "verifyOtp",
        email: req.body.email,
      });

      const statusCode =
        error.message === ERROR_MESSAGES.INVALID_OTP
          ? 400
          : error.message === ERROR_MESSAGES.OTP_EXPIRED
          ? 400
          : 500;

      return sendResponse(res, statusCode, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Password reset instructions sent to your email",
        data: { emailSent: true },
      });
    } catch (error) {
      logger.error(error, {
        controller: "AuthController",
        method: "forgotPassword",
        email: req.body.email,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Reset Password
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Password reset successfully",
        data: result,
      });
    } catch (error) {
      logger.error(error, {
        controller: "AuthController",
        method: "resetPassword",
      });

      const statusCode =
        error.message === ERROR_MESSAGES.INVALID_RESET_TOKEN
          ? 400
          : error.message === ERROR_MESSAGES.RESET_TOKEN_EXPIRED
          ? 400
          : 500;

      return sendResponse(res, statusCode, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Resend OTP
  async resendOtp(req, res) {
    try {
      const { email } = req.body;
      const result = await authService.resendOtp(email);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "OTP sent successfully",
        data: { otpSent: true },
      });
    } catch (error) {
      logger.error(error, {
        controller: "AuthController",
        method: "resendOtp",
        email: req.body.email,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

module.exports = new AuthController();
