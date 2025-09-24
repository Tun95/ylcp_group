const { HEALTH_STATUS } = require("../constants/constants");
const authController = require("../controllers/auth.controller");
const isAdmin = require("../middlewares/admin.middleware");
const {
  signupValidation,
  signinValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../utils/validators");

setupRoutes = (server) => {
  // Auth Routes
  server.route("/auth/signup").post(signupValidation, authController.signup);

  server.route("/auth/signin").post(signinValidation, authController.signin);

  server
    .route("/auth/verify-otp")
    .post(verifyOtpValidation, authController.verifyOtp);

  server
    .route("/auth/forgot-password")
    .post(forgotPasswordValidation, authController.forgotPassword);

  server
    .route("/auth/reset-password")
    .post(resetPasswordValidation, authController.resetPassword);

  server.route("/auth/resend-otp").post(authController.resendOtp);

  // user routes

  // Health check routes
  server.get("/health", async (req, res) => {
    res.status(200).json({ status: HEALTH_STATUS.UP });
  });

  server.get("/", async (req, res) => {
    res.status(200).json({ status: HEALTH_STATUS.UP });
  });
};

module.exports = { setupRoutes };
