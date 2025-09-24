const { HEALTH_STATUS } = require("../constants/constants");
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");
const isAdmin = require("../middlewares/admin.middleware");
const {
  signupValidation,
  signinValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateUserValidation,
  updateProfileValidation,
  updateUserStatusValidation,
} = require("../utils/validators");

setupRoutes = (server) => {
  // AUTHENTICATION ROUTES
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

  // USER MANAGEMENT ROUTES (Protected by auth middleware)
  // User Routes
  server
    .route("/api/user/profile")
    .get(userController.getProfile)
    .put(updateProfileValidation, userController.updateProfile);

  server.route("/api/user/deactivate").put(userController.deactivateAccount);

  // Admin Routes (auth + admin middleware)
  server.route("/api/admin/users").get(isAdmin, userController.getAllUsers);

  server
    .route("/api/admin/users/:userId")
    .get(isAdmin, userController.getUserById)
    .put(isAdmin, updateUserValidation, userController.updateUser)
    .delete(isAdmin, userController.deleteUser);

  server
    .route("/api/admin/users/:userId/status")
    .put(isAdmin, updateUserStatusValidation, userController.updateUserStatus);

  server
    .route("/api/admin/users/:userId/role")
    .put(isAdmin, userController.changeUserRole);

  server
    .route("/api/admin/stats")
    .get(isAdmin, userController.getDashboardStats);

  // Health check routes
  server.get("/health", async (req, res) => {
    res.status(200).json({ status: HEALTH_STATUS.UP });
  });

  server.get("/", async (req, res) => {
    res.status(200).json({ status: HEALTH_STATUS.UP });
  });
};

module.exports = { setupRoutes };
