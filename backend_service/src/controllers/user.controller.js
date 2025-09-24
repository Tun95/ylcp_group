const logger = require("../../config/logger");
const { sendResponse } = require("../utils/utils");
const { ERROR_MESSAGES, STATUS } = require("../constants/constants");
const userService = require("../services/user.service");

class UserController {
  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await userService.getUserById(userId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: { user },
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "getProfile",
        userId: req.user.userId,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;

      const updatedUser = await userService.updateUser(userId, updateData);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Profile updated successfully",
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "updateProfile",
        userId: req.user.userId,
      });

      if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Deactivate account
  async deactivateAccount(req, res) {
    try {
      const userId = req.user.userId;

      await userService.deactivateUser(userId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Account deactivated successfully",
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "deactivateAccount",
        userId: req.user.userId,
      });

      if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Get all users
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;

      const result = await userService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        role,
        status,
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result,
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "getAllUsers",
        adminId: req.user.userId,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Get user by ID
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: { user },
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "getUserById",
        adminId: req.user.userId,
        targetUserId: req.params.userId,
      });

      if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Update user
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      const updatedUser = await userService.updateUser(userId, updateData);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "User updated successfully",
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "updateUser",
        adminId: req.user.userId,
        targetUserId: req.params.userId,
      });

      if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      await userService.deleteUser(userId, req.user.userId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "User deleted successfully",
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "deleteUser",
        adminId: req.user.userId,
        targetUserId: req.params.userId,
      });

      if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      if (error.message === ERROR_MESSAGES.CANNOT_DELETE_SELF) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.CANNOT_DELETE_SELF,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Update user status (merged block/unblock functionality)
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      const updatedUser = await userService.updateUserStatus(userId, status);

      const statusMessages = {
        active: "User activated successfully",
        blocked: "User blocked successfully",
        closed: "User account closed successfully",
      };

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: statusMessages[status] || "User status updated successfully",
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "updateUserStatus",
        adminId: req.user.userId,
        targetUserId: req.params.userId,
        status: req.body.status,
      });

      if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      if (error.message === ERROR_MESSAGES.CANNOT_MODIFY_SELF_STATUS) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.CANNOT_MODIFY_SELF_STATUS,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Change user role
  async changeUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const updatedUser = await userService.changeUserRole(
        userId,
        role,
        req.user.userId
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: `User role changed to ${role} successfully`,
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "changeUserRole",
        adminId: req.user.userId,
        targetUserId: req.params.userId,
      });

      if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.USER_NOT_FOUND,
        });
      }

      if (error.message === ERROR_MESSAGES.CANNOT_MODIFY_SELF_ROLE) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.CANNOT_MODIFY_SELF_ROLE,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Get dashboard stats
  async getDashboardStats(req, res) {
    try {
      const stats = await userService.getDashboardStats();

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: stats,
      });
    } catch (error) {
      logger.error(error, {
        controller: "UserController",
        method: "getDashboardStats",
        adminId: req.user.userId,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

module.exports = new UserController();
