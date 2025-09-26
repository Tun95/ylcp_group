// backend_service/src/test/services/lesson.service.test.js
const lessonService = require("../services/lesson.service");
const AINarrationService = require("../services/aiNarration.service");
const Lesson = require("../../models/lesson.model");
const { ERROR_MESSAGES } = require("../constants/constants");

// Mock ALL external dependencies
jest.mock("../services/aiNarration.service");
jest.mock("../../models/lesson.model");
jest.mock("../services/firebaseStorage.service", () => ({
  uploadAudioFile: jest.fn().mockResolvedValue({
    url: "https://mock-storage.com/audio/test-audio.mp3",
    path: "audio/test-audio.mp3",
    size: 1024,
  }),
  deleteFile: jest.fn().mockResolvedValue(true),
  generateUniqueFilename: jest.fn().mockReturnValue("test-audio.mp3"),
}));

// Mock logger
jest.mock("../../config/logger", () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
}));

describe("LessonService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createLesson", () => {
    const mockLessonData = {
      title: "Test Lesson",
      category: "Safety",
      slides: [
        {
          template_id: "title-slide",
          content: { title: "Welcome" },
          duration: 8,
        },
      ],
      created_by: "user123",
      settings: { auto_generate_narration: true }, // ADD THIS
    };

    test("should create lesson with processed slides", async () => {
      // Mock the processed lesson data
      const mockProcessedLesson = {
        _id: "lesson123",
        ...mockLessonData,
        slides: [
          {
            template_id: "title-slide",
            content: { title: "Welcome" },
            duration: 8,
            slide_number: 1,
            ai_narration: { script: "Welcome narration", status: "pending" },
          },
        ],
        save: jest.fn().mockResolvedValue(this), // Fix: return 'this' for chaining
      };

      // Mock Lesson constructor
      Lesson.mockImplementation(() => mockProcessedLesson);

      // Mock getLessonById to return the populated lesson
      const mockPopulatedLesson = {
        _id: "lesson123",
        title: "Test Lesson",
        slides: [],
        settings: { auto_generate_narration: true }, // ADD THIS
      };

      // Fix: Properly mock the Mongoose query chain for getLessonById
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPopulatedLesson),
      };
      
      Lesson.findById = jest.fn().mockReturnValue(mockQueryChain);
      AINarrationService.generateNarrationScript.mockResolvedValue("Welcome narration");

      const result = await lessonService.createLesson(mockLessonData);

      expect(Lesson).toHaveBeenCalled();
      expect(mockProcessedLesson.save).toHaveBeenCalled();
      expect(result.title).toBe("Test Lesson");
    });

    test("should handle errors during lesson creation", async () => {
      const error = new Error("Database error");
      Lesson.mockImplementation(() => {
        throw error;
      });

      await expect(lessonService.createLesson(mockLessonData)).rejects.toThrow("Database error");
    });
  });

  describe("processSlides", () => {
    test("should process slides with AI narration", async () => {
      const mockSlides = [
        {
          template_id: "content-slide",
          content: { title: "Slide 1", content: "Content 1" },
        },
      ];

      AINarrationService.generateNarrationScript.mockResolvedValue("Narration for slide 1");

      const result = await lessonService.processSlides(mockSlides);

      expect(result).toHaveLength(1);
      expect(result[0].slide_number).toBe(1);
      expect(result[0].ai_narration.script).toBe("Narration for slide 1");
    });

    test("should use default narration when AI fails", async () => {
      const mockSlides = [
        {
          template_id: "title-slide",
          content: { title: "Welcome" },
        },
      ];

      AINarrationService.generateNarrationScript.mockRejectedValue(new Error("API failed"));

      const result = await lessonService.processSlides(mockSlides);

      expect(result[0].ai_narration.script).toContain("Welcome");
    });
  });

  describe("getLessonById", () => {
    test("should return lesson when found", async () => {
      const mockLesson = {
        _id: "lesson123",
        title: "Test Lesson",
      };

      // Fix: Ensure the mock returns a Promise that resolves to the lesson
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLesson), // This should be a function that returns a Promise
      };

      Lesson.findById = jest.fn().mockReturnValue(mockQueryChain);

      const result = await lessonService.getLessonById("lesson123");

      expect(Lesson.findById).toHaveBeenCalledWith("lesson123");
      expect(result.title).toBe("Test Lesson");
    });

    test("should throw error when lesson not found", async () => {
      // Fix: Mock to properly return null for not found case
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null), // This should resolve to null
      };

      Lesson.findById = jest.fn().mockReturnValue(mockQueryChain);

      await expect(lessonService.getLessonById("nonexistent")).rejects.toThrow(
        ERROR_MESSAGES.LESSON_NOT_FOUND
      );
    });
  });

  describe("getAdminLessons", () => {
    test("should return paginated lessons with filters", async () => {
      const mockLessons = [
        { _id: "1", title: "Lesson 1" },
        { _id: "2", title: "Lesson 2" },
      ];

      // Fix: Ensure the mock returns a Promise that resolves to the lessons array
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLessons), // This should resolve to the array
      };

      Lesson.find = jest.fn().mockReturnValue(mockQueryChain);
      Lesson.countDocuments.mockResolvedValue(10);

      const filters = { status: "published", category: "Safety" };
      const pagination = { page: 1, limit: 10 };

      const result = await lessonService.getAdminLessons(filters, pagination);

      expect(Lesson.find).toHaveBeenCalled();
      expect(result.lessons).toEqual(mockLessons);
      expect(result.pagination.total).toBe(10);
    });
  });

  describe("Helper Methods", () => {
    test("getDefaultDuration should return correct durations", () => {
      expect(lessonService.getDefaultDuration("title-slide")).toBe(8);
      expect(lessonService.getDefaultDuration("content-slide")).toBe(15);
      expect(lessonService.getDefaultDuration("unknown")).toBe(10);
    });

    test("getDefaultNarration should return contextual narrations", () => {
      const content = { title: "Test Title", question: "Test Question" };

      const titleNarration = lessonService.getDefaultNarration("title-slide", content);
      const quizNarration = lessonService.getDefaultNarration("quiz-slide", content);

      expect(titleNarration).toContain("Test Title");
      expect(quizNarration).toContain("Test Question");
    });
  });
});