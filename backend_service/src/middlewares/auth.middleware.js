// backend_service/src/middlewares/auth.middleware.js - Authentication middleware
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const { ERROR_MESSAGES, STATUS } = require("../constants/constants");
const config = require("../../config");
const { sendResponse } = require("../utils/utils");

// AUTH MIDDLEWARE
const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return sendResponse(res, 401, {
      status: STATUS.FAILED,
      message: ERROR_MESSAGES.NO_TOKEN,
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    // Try multiple possible ID fields
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return sendResponse(res, 401, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INVALID_TOKEN,
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return sendResponse(res, 401, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INVALID_TOKEN,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    sendResponse(res, 401, {
      status: STATUS.FAILED,
      message: ERROR_MESSAGES.INVALID_TOKEN,
    });
  }
};

module.exports = authMiddleware;
