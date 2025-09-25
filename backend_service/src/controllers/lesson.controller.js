// backend_service/controllers/lesson.controller.js
const logger = require("../../config/logger");
const { sendResponse } = require("../utils/utils");
const { ERROR_MESSAGES, STATUS } = require("../constants/constants");
const lessonService = require("../services/lesson.service");

class LessonController {
  // Create a new lesson
  async createLesson(req, res) {
    try {
      const lessonData = {
        ...req.body,
        created_by: req.user.userId,
      };

      const lesson = await lessonService.createLesson(lessonData);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        message: "Lesson created successfully",
        data: { lesson },
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "createLesson",
        userId: req.user.userId,
      });

      if (error.name === "ValidationError") {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Validation error",
          errors: Object.values(error.errors).map((err) => err.message),
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get lesson by ID
  async getLesson(req, res) {
    try {
      const lesson = await lessonService.getLessonById(req.params.lessonId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: { lesson },
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "getLesson",
        lessonId: req.params.lessonId,
      });

      if (error.message === ERROR_MESSAGES.LESSON_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.LESSON_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get all lessons (with filtering and pagination)
  async getLessons(req, res) {
    try {
      const filters = {
        status: req.query.status,
        category: req.query.category,
        difficulty: req.query.difficulty,
        search: req.query.search,
      };

      // Only allow admins to filter by user
      if (req.user.role === "admin" && req.query.created_by) {
        filters.created_by = req.query.created_by;
      } else {
        // Regular users can only see their own drafts + all published
        if (req.query.status === "draft") {
          filters.created_by = req.user.userId;
        } else {
          filters.status = req.query.status || "published";
        }
      }

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
      };

      const result = await lessonService.getLessons(filters, pagination);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result,
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "getLessons",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update lesson
  async updateLesson(req, res) {
    try {
      const lesson = await lessonService.updateLesson(
        req.params.lessonId,
        req.body
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Lesson updated successfully",
        data: { lesson },
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "updateLesson",
        lessonId: req.params.lessonId,
      });

      if (error.message === ERROR_MESSAGES.LESSON_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.LESSON_NOT_FOUND,
        });
      }

      if (error.name === "ValidationError") {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Validation error",
          errors: Object.values(error.errors).map((err) => err.message),
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Delete lesson
  async deleteLesson(req, res) {
    try {
      const result = await lessonService.deleteLesson(req.params.lessonId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: result.message,
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "deleteLesson",
        lessonId: req.params.lessonId,
      });

      if (error.message === ERROR_MESSAGES.LESSON_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.LESSON_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update lesson status
  async updateLessonStatus(req, res) {
    try {
      const { status } = req.body;

      if (!["draft", "published", "archived"].includes(status)) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Invalid status value",
        });
      }

      const lesson = await lessonService.updateLessonStatus(
        req.params.lessonId,
        status
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: `Lesson ${status} successfully`,
        data: { lesson },
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "updateLessonStatus",
        lessonId: req.params.lessonId,
      });

      if (error.message === ERROR_MESSAGES.LESSON_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.LESSON_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Add slide to lesson
  async addSlide(req, res) {
    try {
      const lesson = await lessonService.addSlide(
        req.params.lessonId,
        req.body
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Slide added successfully",
        data: { lesson },
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "addSlide",
        lessonId: req.params.lessonId,
      });

      if (error.message === ERROR_MESSAGES.LESSON_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.LESSON_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update slide in lesson
  async updateSlide(req, res) {
    try {
      const lesson = await lessonService.updateSlide(
        req.params.lessonId,
        req.params.slideNumber,
        req.body
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Slide updated successfully",
        data: { lesson },
      });
    } catch (error) {
      logger.error(error, {
        controller: "LessonController",
        method: "updateSlide",
        lessonId: req.params.lessonId,
        slideNumber: req.params.slideNumber,
      });

      if (error.message === ERROR_MESSAGES.LESSON_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.LESSON_NOT_FOUND,
        });
      }

      if (error.message === ERROR_MESSAGES.SLIDE_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.SLIDE_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

module.exports = new LessonController();
