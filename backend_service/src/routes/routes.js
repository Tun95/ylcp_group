const { HEALTH_STATUS } = require("../constants/constants");
const authController = require("../controllers/auth.controller");
const lessonController = require("../controllers/lesson.controller");
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
  lessonValidation,
  lessonStatusValidation,
  getUsersValidation,
  requireActiveUser,
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
    .get(requireActiveUser, userController.getProfile)
    .put(
      updateProfileValidation,
      requireActiveUser,
      userController.updateProfile
    );

  server
    .route("/api/user/deactivate")
    .put(requireActiveUser, userController.deactivateAccount);

  // Admin Routes (auth + admin middleware)
  server
    .route("/api/admin/users")
    .get(
      isAdmin,
      requireActiveUser,
      getUsersValidation,
      userController.getAllUsers
    );

  server
    .route("/api/admin/users/:userId")
    .get(isAdmin, requireActiveUser, userController.getUserById)
    .put(
      isAdmin,
      requireActiveUser,
      updateUserValidation,
      userController.updateUser
    )
    .delete(isAdmin, requireActiveUser, userController.deleteUser);

  server
    .route("/api/admin/users/:userId/status")
    .put(
      isAdmin,
      requireActiveUser,
      updateUserStatusValidation,
      userController.updateUserStatus
    );

  server
    .route("/api/admin/users/:userId/role")
    .put(isAdmin, requireActiveUser, userController.changeUserRole);

  server
    .route("/api/admin/stats")
    .get(isAdmin, requireActiveUser, userController.getDashboardStats);

  // ADMIN LESSON ROUTES
  server
    .route("/api/admin/lessons")
    .post(
      isAdmin,
      requireActiveUser,
      lessonValidation,
      lessonController.createLesson
    )
    .get(isAdmin, requireActiveUser, lessonController.getAdminLessons);

  server
    .route("/api/admin/lessons/:lessonId")
    .get(isAdmin, requireActiveUser, lessonController.getLessonById)
    .put(
      isAdmin,
      requireActiveUser,
      lessonValidation,
      lessonController.updateLesson
    );

  server
    .route("/api/admin/lessons/:lessonId/status")
    .put(
      isAdmin,
      requireActiveUser,
      lessonStatusValidation,
      lessonController.updateLessonStatus
    );

  server
    .route("/api/admin/lessons/:lessonId/regenerate-narration")
    .post(isAdmin, requireActiveUser, lessonController.regenerateNarration);

  // Health check routes
  server.get("/health", async (req, res) => {
    res.status(200).json({ status: HEALTH_STATUS.UP });
  });

  server.get("/", async (req, res) => {
    res.status(200).json({ status: HEALTH_STATUS.UP });
  });
};

module.exports = { setupRoutes };
