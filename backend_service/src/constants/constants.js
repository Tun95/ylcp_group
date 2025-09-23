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

// Auth messages
const AUTH = {
  INVALID_CREDENTIALS: "Invalid matric number or password",
  ID_EXPIRED: "Student ID has expired",
  ACCOUNT_DEACTIVATED: "Account is deactivated",
  REGISTRATION_SUCCESS: "User registered successfully",
  LOGIN_SUCCESS: "Login successful",
  QR_VERIFICATION_SUCCESS: "QR code verified successfully",
  QR_INVALID: "Invalid QR code format",
  TOKEN_REQUIRED: "Access denied. No token provided.",
  TOKEN_INVALID: "Token is not valid.",
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

  //User error messages
  INVALID_USER_ID: "Invalid or missing user ID",
  USER_NOT_FOUND: "User not found",
};

module.exports = {
  STATUS,
  HEALTH_STATUS,
  ERROR_MESSAGES,
  AUTH,
};
