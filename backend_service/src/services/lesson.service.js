// backend_service/services/lesson.service.js
const logger = require("../../config/logger");
const Lesson = require("../../models/lesson.model");
const { ERROR_MESSAGES } = require("../constants/constants");

class LessonService {
  // Create a new lesson
  async createLesson(lessonData) {
    try {
      // Auto-calculate slide numbers if not provided
      if (lessonData.slides && Array.isArray(lessonData.slides)) {
        lessonData.slides = lessonData.slides.map((slide, index) => ({
          ...slide,
          slide_number: slide.slide_number || index + 1,
        }));
      }

      const lesson = new Lesson(lessonData);
      await lesson.save();

      return await this.getLessonById(lesson._id); // Return populated data
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "createLesson",
        data: { created_by: lessonData.created_by },
      });
      throw error;
    }
  }

  // Get lesson by ID
  async getLessonById(lessonId) {
    try {
      const lesson = await Lesson.findById(lessonId)
        .populate("created_by", "first_name last_name email")
        .lean();

      if (!lesson) {
        throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
      }

      return lesson;
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "getLessonById",
        lessonId,
      });
      throw error;
    }
  }

  // Get all lessons with filtering and pagination
  async getLessons(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = pagination;

      const { status, category, difficulty, created_by, search } = filters;

      // Build query
      const query = {};

      if (status) query.status = status;
      if (category) query.category = new RegExp(category, "i");
      if (difficulty) query.difficulty = difficulty;
      if (created_by) query.created_by = created_by;

      if (search) {
        query.$or = [
          { title: new RegExp(search, "i") },
          { description: new RegExp(search, "i") },
          { tags: new RegExp(search, "i") },
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const lessons = await Lesson.find(query)
        .populate("created_by", "first_name last_name email")
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Lesson.countDocuments(query);

      return {
        lessons,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      };
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "getLessons",
        filters,
      });
      throw error;
    }
  }

  // Update lesson
  async updateLesson(lessonId, updateData) {
    try {
      // Auto-update slide numbers if slides are modified
      if (updateData.slides && Array.isArray(updateData.slides)) {
        updateData.slides = updateData.slides.map((slide, index) => ({
          ...slide,
          slide_number: slide.slide_number || index + 1,
        }));
      }

      // Update published_at if status changes to published
      if (updateData.status === "published") {
        updateData.published_at = new Date();
      }

      const lesson = await Lesson.findByIdAndUpdate(
        lessonId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("created_by", "first_name last_name email");

      if (!lesson) {
        throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
      }

      return lesson;
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "updateLesson",
        lessonId,
      });
      throw error;
    }
  }

  // Delete lesson
  async deleteLesson(lessonId) {
    try {
      const lesson = await Lesson.findByIdAndDelete(lessonId);

      if (!lesson) {
        throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
      }

      return { message: "Lesson deleted successfully" };
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "deleteLesson",
        lessonId,
      });
      throw error;
    }
  }

  // Get lessons by creator
  async getLessonsByUser(userId, filters = {}) {
    try {
      return await this.getLessons({ ...filters, created_by: userId });
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "getLessonsByUser",
        userId,
      });
      throw error;
    }
  }

  // Update lesson status
  async updateLessonStatus(lessonId, status) {
    try {
      const updateData = { status };
      if (status === "published") {
        updateData.published_at = new Date();
      }

      return await this.updateLesson(lessonId, updateData);
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "updateLessonStatus",
        lessonId,
        status,
      });
      throw error;
    }
  }

  // Add slide to lesson
  async addSlide(lessonId, slideData) {
    try {
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
      }

      const slideNumber = lesson.slides.length + 1;
      const newSlide = {
        ...slideData,
        slide_number: slideNumber,
      };

      lesson.slides.push(newSlide);
      await lesson.save();

      return await this.getLessonById(lessonId);
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "addSlide",
        lessonId,
      });
      throw error;
    }
  }

  // Update slide in lesson
  async updateSlide(lessonId, slideNumber, slideData) {
    try {
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
      }

      const slideIndex = lesson.slides.findIndex(
        (slide) => slide.slide_number === parseInt(slideNumber)
      );

      if (slideIndex === -1) {
        throw new Error(ERROR_MESSAGES.SLIDE_NOT_FOUND);
      }

      lesson.slides[slideIndex] = {
        ...lesson.slides[slideIndex].toObject(),
        ...slideData,
      };

      await lesson.save();
      return await this.getLessonById(lessonId);
    } catch (error) {
      logger.error(error, {
        service: "LessonService",
        method: "updateSlide",
        lessonId,
        slideNumber,
      });
      throw error;
    }
  }
}

module.exports = new LessonService();
