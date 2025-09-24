const config = require("../../config");
const logger = require("../../config/logger");
const userModel = require("../../models/user.model");
const { ERROR_MESSAGES } = require("../constants/constants");

class UserService {
  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await userModel
        .findById(userId)
        .select(
          "-password -password_reset_token -password_reset_expires -account_verification_otp -account_verification_otp_expires"
        );

      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return user;
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "getUserById",
        userId,
      });
      throw error;
    }
  }

  // Update user profile
  async updateUser(userId, updateData) {
    try {
      const user = await userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateData },
          { new: true, runValidators: true }
        )
        .select(
          "-password -password_reset_token -password_reset_expires -account_verification_otp -account_verification_otp_expires"
        );

      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return user;
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "updateUser",
        userId,
      });
      throw error;
    }
  }

  // Deactivate user account
  async deactivateUser(userId) {
    try {
      const user = await userModel.findByIdAndUpdate(
        userId,
        { status: "closed" },
        { new: true }
      );

      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return true;
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "deactivateUser",
        userId,
      });
      throw error;
    }
  }

  // Admin: Get all users with pagination and filtering
  async getAllUsers({ page, limit, search, role, status }) {
    try {
      const query = {};

      // Search filter
      if (search) {
        query.$or = [
          { first_name: { $regex: search, $options: "i" } },
          { last_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Role filter
      if (role) {
        query.role = role;
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        userModel
          .find(query)
          .select(
            "-password -password_reset_token -password_reset_expires -account_verification_otp -account_verification_otp_expires"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        userModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: total,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "getAllUsers",
      });
      throw error;
    }
  }

  // Admin: Delete user
  async deleteUser(userId, adminId) {
    try {
      const user = await userModel.findById(userId);

      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Prevent admin from deleting themselves
      if (user._id.toString() === adminId) {
        throw new Error(ERROR_MESSAGES.CANNOT_DELETE_SELF);
      }

      await userModel.findByIdAndDelete(userId);
      return true;
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "deleteUser",
        userId,
      });
      throw error;
    }
  }

  // Admin: Update user status (merged block/unblock functionality)
  async updateUserStatus(userId, status, adminId) {
    try {
      // Prevent admin from modifying their own status
      if (userId === adminId) {
        throw new Error(ERROR_MESSAGES.CANNOT_MODIFY_SELF_STATUS);
      }

      const user = await userModel
        .findByIdAndUpdate(
          userId,
          { status },
          { new: true, runValidators: true }
        )
        .select(
          "-password -password_reset_token -password_reset_expires -account_verification_otp -account_verification_otp_expires"
        );

      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return user;
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "updateUserStatus",
        userId,
        status,
      });
      throw error;
    }
  }

  // Admin: Change user role
  async changeUserRole(userId, role, adminId) {
    try {
      // Prevent admin from changing their own role
      if (userId === adminId) {
        throw new Error(ERROR_MESSAGES.CANNOT_MODIFY_SELF_ROLE);
      }

      const user = await userModel
        .findByIdAndUpdate(
          userId,
          {
            role,
            is_admin: role === "admin",
          },
          { new: true, runValidators: true }
        )
        .select(
          "-password -password_reset_token -password_reset_expires -account_verification_otp -account_verification_otp_expires"
        );

      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return user;
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "changeUserRole",
        userId,
        role,
      });
      throw error;
    }
  }

  // Admin: Get dashboard statistics
  async getDashboardStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        blockedUsers,
        closedUsers,
        adminUsers,
        newUsersThisWeek,
        newUsersThisMonth,
      ] = await Promise.all([
        userModel.countDocuments(),
        userModel.countDocuments({ status: "active" }),
        userModel.countDocuments({ status: "blocked" }),
        userModel.countDocuments({ status: "closed" }),
        userModel.countDocuments({ role: "admin" }),
        userModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        userModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        blockedUsers,
        closedUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
        newUsersThisWeek,
        newUsersThisMonth,
      };
    } catch (error) {
      logger.error(error, {
        service: "UserService",
        method: "getDashboardStats",
      });
      throw error;
    }
  }
}

module.exports = new UserService();
