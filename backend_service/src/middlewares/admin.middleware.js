const { sendResponse } = require("../utils/utils");
const { ERROR_MESSAGES, STATUS } = require("../constants/constants");

//ADMIN MIDDLEWARE
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.is_admin === true)) {
    next();
  } else {
    return sendResponse(res, 403, {
      status: STATUS.FAILED,
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }
};

module.exports = isAdmin;
