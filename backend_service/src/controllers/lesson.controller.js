// backend_service/controllers/lesson.controller.js
const logger = require("../../config/logger");
const { sendResponse } = require("../utils/utils");
const { ERROR_MESSAGES, STATUS } = require("../constants/constants");
const lessonService = require("../services/lesson.service");

class LessonController {
  // Create lesson with automatic video generation
  async createLesson(req, res) {
    try {
      const lessonData = {
        ...req.body,
        created_by: req.user,
      };

      const lesson = await lessonService.createLesson(lessonData);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        message:
          "Lesson created successfully. Interactive video is being generated.",
        data: { lesson },
      });
    } catch (error) {
      logger.error("Lesson creation error:", error);

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

  // Get all lessons
  async getAdminLessons(req, res) {
    try {
      const filters = {
        status: req.query.status,
        search: req.query.search,
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const result = await lessonService.getAdminLessons(filters, pagination);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result,
      });
    } catch (error) {
      logger.error("Get lessons error:", error);
      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get specific lesson
  async getLessonById(req, res) {
    try {
      const lesson = await lessonService.getLessonById(req.params.lessonId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: { lesson },
      });
    } catch (error) {
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

  // Update lesson
  async updateLesson(req, res) {
    try {
      const lesson = await lessonService.updateLesson(
        req.params.lessonId,
        req.body
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message:
          "Lesson updated successfully. Video will be regenerated if content changed.",
        data: { lesson },
      });
    } catch (error) {
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

  // Regenerate video
  async regenerateVideo(req, res) {
    try {
      const lesson = await lessonService.regenerateVideo(req.params.lessonId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Video regeneration started",
        data: { lesson },
      });
    } catch (error) {
      if (error.message === ERROR_MESSAGES.LESSON_NOT_FOUND) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.LESSON_NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: "Video regeneration failed",
      });
    }
  }

  // Delete lesson
  async deleteLesson(req, res) {
    try {
      await lessonService.deleteLesson(req.params.lessonId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: "Lesson deleted successfully",
      });
    } catch (error) {
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
}

module.exports = new LessonController();
