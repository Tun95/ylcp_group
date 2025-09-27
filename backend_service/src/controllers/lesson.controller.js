// backend_service/controllers/lesson.controller.js
const logger = require("../../config/logger");
const { sendResponse } = require("../utils/utils");
const { ERROR_MESSAGES, STATUS } = require("../constants/constants");
const lessonService = require("../services/lesson.service");

class LessonController {
  // Admin: Create a new lesson with AI narration
  async createLesson(req, res) {
    try {
      const lessonData = {
        ...req.body,
        created_by: req.user, // Admin user ID
      };

      const lesson = await lessonService.createLesson(lessonData);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        message:
          "Lesson created successfully. AI narration is being generated.",
        data: { lesson },
      });
    } catch (error) {
      logger.error("Lesson creation error:", {
        controller: "LessonController",
        method: "createLesson",
        userId: req.user,
        error: error.message,
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

  // Admin: Get all lessons (with filters)
  async getAdminLessons(req, res) {
    try {
      const filters = {
        status: req.query.status,
        category: req.query.category,
        search: req.query.search,
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
      };

      const result = await lessonService.getAdminLessons(filters, pagination);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result,
      });
    } catch (error) {
      logger.error("Get admin lessons error:", {
        controller: "LessonController",
        method: "getAdminLessons",
        error: error.message,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Admin: Get specific lesson
  async getLessonById(req, res) {
    try {
      const lesson = await lessonService.getLessonById(req.params.lessonId);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: { lesson },
      });
    } catch (error) {
      logger.error("Get lesson error:", {
        controller: "LessonController",
        method: "getLessonById",
        lessonId: req.params.lessonId,
        error: error.message,
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

  // Admin: Update lesson
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
      logger.error("Update lesson error:", {
        controller: "LessonController",
        method: "updateLesson",
        lessonId: req.params.lessonId,
        error: error.message,
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

  // Admin: Regenerate AI narration for a lesson
  async regenerateNarration(req, res) {
    try {
      const lesson = await lessonService.getLessonById(req.params.lessonId);

      // Trigger background narration regeneration
      lessonService.generateLessonNarration(lesson._id).catch((error) => {
        logger.error("Background narration regeneration failed:", error);
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message:
          "AI narration regeneration started. This may take a few minutes.",
        data: { lessonId: lesson._id },
      });
    } catch (error) {
      logger.error("Regenerate narration error:", {
        controller: "LessonController",
        method: "regenerateNarration",
        lessonId: req.params.lessonId,
        error: error.message,
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

  // Admin: Update lesson status
  async updateLessonStatus(req, res) {
    try {
      const { status } = req.body;

      if (!["draft", "published", "archived"].includes(status)) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Invalid status value",
        });
      }

      const updateData = { status };
      if (status === "published") {
        updateData.published_at = new Date();
      }

      const lesson = await lessonService.updateLesson(
        req.params.lessonId,
        updateData
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: `Lesson ${status} successfully`,
        data: { lesson },
      });
    } catch (error) {
      logger.error("Update lesson status error:", {
        controller: "LessonController",
        method: "updateLessonStatus",
        lessonId: req.params.lessonId,
        error: error.message,
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
}

module.exports = new LessonController();
