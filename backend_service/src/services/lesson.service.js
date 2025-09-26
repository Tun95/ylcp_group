// backend_service/services/lesson.service.js
const logger = require("../../config/logger");
const Lesson = require("../../models/lesson.model");
const AINarrationService = require("./aiNarration.service");
const FirebaseStorageService = require("./firebaseStorage.service");
const { ERROR_MESSAGES } = require("../constants/constants");

class LessonService {
  // Create lesson with AI narration generation
  async createLesson(lessonData) {
    try {
      const processedSlides = await this.processSlides(lessonData.slides);

      const lesson = new Lesson({
        ...lessonData,
        slides: processedSlides,
      });

      await lesson.save();

      // Start AI narration generation in background
      if (lesson.settings.auto_generate_narration) {
        this.generateLessonNarration(lesson._id).catch((error) => {
          logger.error("Background narration generation failed:", error);
        });
      }

      return await this.getLessonById(lesson._id);
    } catch (error) {
      logger.error("Lesson creation failed:", error);
      throw error;
    }
  }

  // Process slides - generate AI narration scripts
  async processSlides(slides) {
    let previousContext = "";

    const processedSlides = await Promise.all(
      slides.map(async (slide, index) => {
        const slideNumber = index + 1;

        // Generate AI narration script
        let narrationScript = slide.ai_narration?.script;
        if (!narrationScript && slide.content) {
          try {
            narrationScript = await AINarrationService.generateNarrationScript(
              slide.content,
              slide.template_id,
              previousContext
            );
            previousContext =
              slide.content.title || slide.content.content || "";
          } catch (error) {
            narrationScript = this.getDefaultNarration(
              slide.template_id,
              slide.content
            );
            logger.warn(
              `Using default narration for slide ${slideNumber}:`,
              error.message
            );
          }
        }

        return {
          ...slide,
          slide_number: slideNumber,
          ai_narration: {
            ...slide.ai_narration,
            script: narrationScript,
            status: narrationScript ? "pending" : "failed",
          },
          duration:
            slide.duration || this.getDefaultDuration(slide.template_id),
        };
      })
    );

    return processedSlides;
  }

  // Generate audio narrations for all slides in a lesson
  async generateLessonNarration(lessonId) {
    try {
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) throw new Error("Lesson not found");

      lesson.narration_status = "generating";
      await lesson.save();

      for (let i = 0; i < lesson.slides.length; i++) {
        const slide = lesson.slides[i];

        if (
          slide.ai_narration.script &&
          slide.ai_narration.status === "pending"
        ) {
          try {
            const audioResult = await AINarrationService.generateSpeech(
              slide.ai_narration.script,
              lesson.settings.ai_voice
            );

            slide.ai_narration.audio_url = audioResult.audioUrl;
            slide.ai_narration.status = "completed";
            slide.ai_narration.generated_at = new Date();

            if (audioResult.filePath) {
              slide.ai_narration.file_path = audioResult.filePath;
            }

            await lesson.save();

            logger.info(
              `Narration generated for slide ${i + 1} of lesson ${lessonId}`
            );
          } catch (error) {
            slide.ai_narration.status = "failed";
            slide.ai_narration.error = error.message;
            logger.error(
              `Narration generation failed for slide ${i + 1}:`,
              error
            );
          }

          // Add delay to avoid rate limiting
          await this.delay(1000);
        }
      }

      lesson.narration_status = "completed";
      await lesson.save();

      logger.info(`Narration generation completed for lesson ${lessonId}`);
    } catch (error) {
      const lesson = await Lesson.findById(lessonId);
      if (lesson) {
        lesson.narration_status = "failed";
        await lesson.save();
      }
      logger.error(
        `Narration generation failed for lesson ${lessonId}:`,
        error
      );
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
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;
    const { status, category, search } = filters;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = new RegExp(category, "i");
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const lessons = await Lesson.find(query)
      .populate("created_by", "first_name last_name email")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
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

  // Update lesson
  async updateLesson(lessonId, updateData) {
    if (updateData.slides) {
      updateData.slides = await this.processSlides(updateData.slides);
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
  }

  // Delete lesson and associated audio files
  async deleteLesson(lessonId) {
    try {
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new Error(ERROR_MESSAGES.LESSON_NOT_FOUND);
      }

      // Delete associated audio files from Firebase
      for (const slide of lesson.slides) {
        if (slide.ai_narration?.file_path) {
          await FirebaseStorageService.deleteFile(
            slide.ai_narration.file_path
          ).catch((error) =>
            logger.error("Failed to delete audio file:", error)
          );
        }
      }

      await Lesson.findByIdAndDelete(lessonId);

      return { message: "Lesson deleted successfully" };
    } catch (error) {
      logger.error("Lesson deletion failed:", error);
      throw error;
    }
  }

  // Helper methods
  getDefaultDuration(templateId) {
    const durations = {
      "title-slide": 8,
      "content-slide": 15,
      "quiz-slide": 20,
      "interactive-slide": 12,
    };
    return durations[templateId] || 10;
  }

  getDefaultNarration(templateId, content) {
    const defaults = {
      "title-slide": `Welcome to our lesson on ${
        content.title || "this topic"
      }. Let's begin our learning journey.`,
      "content-slide": `Let's explore this important concept: ${
        content.title || ""
      }. ${content.content || ""}`,
      "quiz-slide": `Consider this question: ${
        content.question || "What do you think?"
      }. Take a moment to reflect.`,
    };
    return (
      defaults[templateId] || "Let's continue with this important content."
    );
  }

  // Delay helper for rate limiting
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new LessonService();
