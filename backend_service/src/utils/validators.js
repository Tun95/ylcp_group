// backend_service/src/utils/validators.js
const { body, validationResult } = require("express-validator");
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  handleValidationErrors,
];

module.exports = {
  signupValidation,
  signinValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};
