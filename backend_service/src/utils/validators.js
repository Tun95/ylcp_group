// backend_service/src/utils/validators.js
const { body, param, query, validationResult } = require("express-validator");
const { STATUS, ERROR_MESSAGES } = require("../constants/constants");

// Common validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: STATUS.FAILED,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: errors.array(),
    });
  }
  next();
};

// Signup Validation
const signupValidation = [
  body("role")
    .isIn(["user", "admin"])
    .withMessage("Role must be either 'user' or 'admin'"),

  body("first_name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),

  body("last_name")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&+])[A-Za-z\d@$!%*?&+]/
    )
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&+)"
    ),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),

  body("language")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage("Language must be between 2 and 10 characters"),

  body("location")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be less than 100 characters"),

  body("topics_of_interest")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Topics of interest must be less than 500 characters"),

  handleValidationErrors,
];

// Signin Validation
const signinValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

// OTP Verification Validation
const verifyOtpValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  handleValidationErrors,
];

// Forgot Password Validation
const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  handleValidationErrors,
];

// Reset Password Validation
const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&+])[A-Za-z\d@$!%*?&+]/
    )
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&+)"
    ),

  handleValidationErrors,
];

// Update Profile Validation
const updateProfileValidation = [
  body("first_name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),

  body("last_name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),

  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),

  body("language")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage("Language must be between 2 and 10 characters"),

  body("location")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location must be less than 100 characters"),

  body("about_me")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("About me must be less than 500 characters"),

  body("topics_of_interest")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Topics of interest must be less than 500 characters"),

  handleValidationErrors,
];

// Update User Validation (Admin)
const updateUserValidation = [
  param("userId").isMongoId().withMessage("Invalid user ID"),

  body("first_name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),

  body("last_name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),

  body("role")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("Role must be user or admin"),

  body("status")
    .optional()
    .isIn(["active", "blocked", "closed"])
    .withMessage("Status must be active, blocked, or closed"),

  handleValidationErrors,
];

// Update User Status Validation (Admin)
const updateUserStatusValidation = [
  param("userId").isMongoId().withMessage("Invalid user ID"),

  body("status")
    .isIn(["active", "blocked", "closed"])
    .withMessage("Status must be active, blocked, or closed"),

  handleValidationErrors,
];

// lesson Validation
const lessonValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Lesson title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be less than 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must be less than 1000 characters"),

  body("category").trim().notEmpty().withMessage("Category is required"),

  body("difficulty")
    .optional()
    .isIn(["beginner", "intermediate", "advanced"])
    .withMessage("Difficulty must be beginner, intermediate, or advanced"),

  body("slides")
    .isArray({ min: 1 })
    .withMessage("At least one slide is required"),

  body("slides.*.template_id")
    .notEmpty()
    .withMessage("Slide template ID is required"),

  body("slides.*.duration")
    .isInt({ min: 1 })
    .withMessage("Slide duration must be at least 1 second"),

  body("slides.*.content")
    .optional()
    .isObject()
    .withMessage("Slide content must be an object"),

  handleValidationErrors,
];

const lessonStatusValidation = [
  body("status")
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be draft, published, or archived"),
  handleValidationErrors,
];

module.exports = {
  signupValidation,
  signinValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  updateUserValidation,
  updateUserStatusValidation,
  lessonValidation,
  lessonStatusValidation,
};
