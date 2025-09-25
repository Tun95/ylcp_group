// backend_service/src/constants/messages.js - Error and success messages

// Server Health
const HEALTH_STATUS = {
  UP: "UP",
  DOWN: "DOWN",
};

// Status messagesw
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  FAILED: "failed",
  SUCCESS: "success",
  ERROR: "error",
  COMPLETED: "completed",
  PROCESSING: "processing",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
};

const ERROR_MESSAGES = {
  // General messages
  NOT_FOUND: "API endpoint not found",
  NO_TOKEN: "No token, authorization denied",
  INVALID_TOKEN: "Invalid API token",
  INVALID_CREDENTIALS: "Invalid credentials",
  BAD_REQUEST: "Bad Request",
  OPERATION_FAILED: "Operation failed",
  MISSING_ADDRESS: "Missing address",
  MISSING_NETWORK: "Missing network",
  UNAUTHORIZED: "Unauthorized",
  INVALID_ADDRESS: "Invalid address",
  INTERNAL_SERVER_ERROR: "Internal server error",
  NOT_FOUND: "Resource not found",
  INVALID_SIGNATURE: "Invalid Signature",

  //Auth related messages
  VALIDATION_ERROR: "Validation error",
  DUPLICATE_EMAIL: "Email already exists",
  ACCOUNT_NOT_VERIFIED: "Please verify your account first",
  ACCOUNT_ALREADY_VERIFIED: "Account is already verified",
  ACCOUNT_DEACTIVATED: "Your account has been deactivated",
  INVALID_OTP: "Invalid OTP",
  OTP_EXPIRED: "OTP has expired",
  INVALID_RESET_TOKEN: "Invalid or expired reset token",
  RESET_TOKEN_EXPIRED: "Reset token has expired",

  //User error messages
  INVALID_USER_ID: "Invalid or missing user ID",
  USER_NOT_FOUND: "User not found",
  ACCESS_DENIED: "Access denied",
  INVALID_TOKEN: "Invalid token",
  ADMIN_ACCESS_REQUIRED: "Admin access required",
  INVALID_PASSWORD: "Invalid current password",
  CANNOT_DELETE_SELF: "You cannot delete your own account",
  CANNOT_MODIFY_SELF_ROLE: "You cannot modify your own role",
  CANNOT_MODIFY_SELF_STATUS: "You cannot modify your own status",

  //Lesson error messages
  LESSON_NOT_FOUND: "Lesson not found",
  SLIDE_NOT_FOUND: "Slide not found",
  UNAUTHORIZED_LESSON_ACCESS: "Unauthorized access to lesson",
};

module.exports = {
  STATUS,
  HEALTH_STATUS,
  ERROR_MESSAGES,
};
