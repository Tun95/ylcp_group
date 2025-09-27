// backend_service/services/lesson.service.js
const logger = require("../../config/logger");
const Lesson = require("../../models/lesson.model");
const VideoGenerationService = require("./videoGeneration.service");
const { ERROR_MESSAGES } = require("../constants/constants");

class LessonService {
  // Create lesson with automatic video generation
  async createLesson(lessonData) {
    try {
      const lesson = new Lesson({
        ...lessonData,
        interactive_video: { status: "generating" },
      });

      await lesson.save();

      // Generate video immediately
      this.generateLessonVideo(lesson._id).catch((error) => {
        logger.error("Background video generation failed:", error);
      });

      return lesson;
    } catch (error) {
      logger.error("Lesson creation failed:", error);
      throw error;
    }
  }

  // Generate interactive video for lesson
  async generateLessonVideo(lessonId) {
    try {
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const videoResult = await VideoGenerationService.generateInteractiveVideo(
        lesson
      );

      // Update lesson with video data
      lesson.interactive_video = {
        video_url: videoResult.video_url,
        thumbnail_url: videoResult.thumbnail_url,
        duration: videoResult.duration,
        status: "completed",
        generated_at: new Date(),
      };

      await lesson.save();
      logger.info(`Video generated for lesson ${lessonId}`);

      return lesson;
    } catch (error) {
      const lesson = await Lesson.findById(lessonId);
      if (lesson) {
        lesson.interactive_video.status = "failed";
        lesson.interactive_video.error = error.message;
        await lesson.save();
      }
      logger.error(`Video generation failed for lesson ${lessonId}:`, error);
      throw error;
    }
  }

  // Get lesson by ID
  async getLessonById(lessonId) {
    const lesson = await Lesson.findById(lessonId).populate(
      "created_by",
      "first_name last_name email"
    );

    if (!lesson) {
      throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
    }

    return lesson;
  }

  // Get all lessons for admin
  async getAdminLessons(filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const { status, search } = filters;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const lessons = await Lesson.find(query)
      .populate("created_by", "first_name last_name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lesson.countDocuments(query);

    return {
      lessons,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    };
  }

  // Update lesson (regenerate video if content changes)
  async updateLesson(lessonId, updateData) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);

    const originalContent = JSON.stringify(lesson.slides);

    const updatedLesson = await Lesson.findByIdAndUpdate(
      lessonId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Regenerate video if content changed significantly
    const newContent = JSON.stringify(updatedLesson.slides);
    if (originalContent !== newContent) {
      this.generateLessonVideo(lessonId).catch((error) => {
        logger.error("Auto video regeneration failed:", error);
      });
    }

    return updatedLesson;
  }

  // Delete lesson
  async deleteLesson(lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
    }

    // TODO: Delete video file from storage
    await Lesson.findByIdAndDelete(lessonId);

    return { message: "Lesson deleted successfully" };
  }

  // Regenerate video manually
  async regenerateVideo(lessonId) {
    return this.generateLessonVideo(lessonId);
  }
}

module.exports = new LessonService();
