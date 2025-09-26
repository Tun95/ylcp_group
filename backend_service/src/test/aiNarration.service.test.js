// backend_service/src/test/services/aiNarration.service.test.js
const aiNarrationService = require("../services/aiNarration.service");
const axios = require("axios");
const FirebaseStorageService = require("../services/firebaseStorage.service");

// Mock everything
jest.mock("axios");
jest.mock("../services/firebaseStorage.service", () => ({
  uploadAudioFile: jest.fn().mockResolvedValue({
    url: "https://mock-storage.com/audio/test.mp3",
    path: "audio/test.mp3",
  }),
  generateUniqueFilename: jest.fn().mockReturnValue("test-audio.mp3"),
}));

// Mock logger
jest.mock("../../config/logger", () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
}));

// Mock config with proper values
jest.mock("../../config", () => ({
  providers: {
    ai: {
      // Use actual values from process.env
      elevenLabsApiKey: process.env.ELEVEN_LABS_API_KEY,
      openAiApiKey: process.env.OPENAI_API_KEY,
    },
  },
  env: "test",
}));

describe("AINarrationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables for each test
    process.env.OPENAI_API_KEY = "your_openai_api_key";
    process.env.ELEVEN_LABS_API_KEY = "your_eleven_labs_api_key";
  });

  describe("generateNarrationScript", () => {
    const mockSlideContent = {
      title: "Test Slide",
      content: "This is test content for narration.",
    };

    test("should return default narration when OpenAI API key is not configured", async () => {
      process.env.OPENAI_API_KEY = "your_openai_api_key";

      const result = await aiNarrationService.generateNarrationScript(
        mockSlideContent,
        "content-slide"
      );

      expect(result).toContain("Test Slide");
      expect(typeof result).toBe("string");
    });

    test("should call OpenAI API when valid key is present", async () => {
      // Fix: Set the environment variable BEFORE requiring the service
      process.env.OPENAI_API_KEY = "sk-real-key-here";

      const mockResponse = {
        data: {
          choices: [
            {
              message: { content: "This is an AI-generated narration script." },
            },
          ],
        },
      };

      // Fix: Mock axios.post to return the response
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await aiNarrationService.generateNarrationScript(
        mockSlideContent,
        "content-slide"
      );

      // Fix: Check if axios.post was called with the right arguments
      expect(axios.post).toHaveBeenCalledWith(
        "https://api.openai.com/v1/chat/completions",
        expect.objectContaining({
          model: "gpt-3.5-turbo",
          messages: expect.any(Array),
        }),
        expect.any(Object)
      );
      expect(result).toBe("This is an AI-generated narration script.");
    });

    test("should handle OpenAI API errors gracefully", async () => {
      process.env.OPENAI_API_KEY = "sk-real-key-here";

      axios.post.mockRejectedValue(new Error("API Error"));

      const result = await aiNarrationService.generateNarrationScript(
        mockSlideContent,
        "content-slide"
      );

      expect(result).toContain("Test Slide");
    });

    test("should build appropriate prompts for different template types", () => {
      const titlePrompt = aiNarrationService.buildNarrationPrompt(
        { title: "Welcome" },
        "title-slide"
      );
      expect(titlePrompt).toContain("Welcome");
    });
  });

  describe("generateSpeech", () => {
    const mockText = "This is a test narration text.";

    test("should return mock data when ElevenLabs API key is not configured", async () => {
      process.env.ELEVEN_LABS_API_KEY = "your_eleven_labs_api_key";

      const result = await aiNarrationService.generateSpeech(mockText);

      expect(result.audioUrl).toContain("storage.googleapis.com");
      expect(result.isMock).toBe(true);
    });

    test("should call ElevenLabs API when valid key is present", async () => {
      // Fix: Set the environment variable
      process.env.ELEVEN_LABS_API_KEY = "sk-real-elevenlabs-key";

      const mockAudioBuffer = Buffer.from("mock audio data");
      axios.post.mockResolvedValue({ data: mockAudioBuffer });

      const result = await aiNarrationService.generateSpeech(mockText, {
        voice_id: "test-voice",
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("https://api.elevenlabs.io/v1/text-to-speech/"),
        expect.objectContaining({
          text: mockText,
        }),
        expect.any(Object)
      );
      expect(FirebaseStorageService.uploadAudioFile).toHaveBeenCalled();
    });
  });

  describe("estimateAudioDuration", () => {
    test("should calculate duration based on word count", () => {
      const shortText = "Hello world";
      const shortDuration = aiNarrationService.estimateAudioDuration(shortText);
      expect(shortDuration).toBeGreaterThan(0);
    });
  });

  describe("getAvailableVoices", () => {
    test("should return mock voices when API key is not configured", async () => {
      process.env.ELEVEN_LABS_API_KEY = "your_eleven_labs_api_key";

      const voices = await aiNarrationService.getAvailableVoices();

      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
    });

    test("should call ElevenLabs voices API when key is present", async () => {
      process.env.ELEVEN_LABS_API_KEY = "sk-real-key";

      const mockVoices = {
        voices: [{ voice_id: "v1", name: "Rachel", category: "premade" }],
      };

      axios.get.mockResolvedValue({ data: mockVoices });

      const voices = await aiNarrationService.getAvailableVoices();

      expect(axios.get).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/voices",
        expect.any(Object)
      );
      expect(voices).toEqual(mockVoices.voices);
    });
  });
});
