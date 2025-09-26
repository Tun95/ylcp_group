// backend_service/src/test/services/aiNarration.service.test.js
const aiNarrationService = require("../services/aiNarration.service"); // Import the instance
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

      axios.post.mockResolvedValue(mockResponse);

      const result = await aiNarrationService.generateNarrationScript(
        mockSlideContent,
        "content-slide"
      );

      expect(axios.post).toHaveBeenCalled();
      expect(result).toBe("This is an AI-generated narration script.");
    });

    test("should handle OpenAI API errors gracefully", async () => {
      process.env.OPENAI_API_KEY = "sk-real-key-here";

      axios.post.mockRejectedValue(new Error("API Error"));

      const result = await aiNarrationService.generateNarrationScript(
        mockSlideContent,
        "content-slide"
      );

      expect(result).toContain("Test Slide"); // Should fallback to default
    });

    test("should build appropriate prompts for different template types", () => {
      const titlePrompt = aiNarrationService.buildNarrationPrompt(
        { title: "Welcome" },
        "title-slide"
      );
      expect(titlePrompt).toContain("Welcome");
      expect(titlePrompt).toContain("introduction");
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
      process.env.ELEVEN_LABS_API_KEY = "sk-real-elevenlabs-key";

      const mockAudioBuffer = Buffer.from("mock audio data");
      axios.post.mockResolvedValue({ data: mockAudioBuffer });

      const result = await aiNarrationService.generateSpeech(mockText, {
        voice_id: "test-voice",
      });

      expect(axios.post).toHaveBeenCalled();
      expect(FirebaseStorageService.uploadAudioFile).toHaveBeenCalled();
    });
  });

  describe("estimateAudioDuration", () => {
    test("should calculate duration based on word count", () => {
      const shortText = "Hello world";
      const longText =
        "This is a much longer piece of text that should take more time to speak aloud in a natural pacing for educational content.";

      const shortDuration = aiNarrationService.estimateAudioDuration(shortText);
      const longDuration = aiNarrationService.estimateAudioDuration(longText);

      expect(shortDuration).toBeGreaterThan(0);
      expect(longDuration).toBeGreaterThan(shortDuration);
    });
  });

  describe("getAvailableVoices", () => {
    test("should return mock voices when API key is not configured", async () => {
      process.env.ELEVEN_LABS_API_KEY = "your_eleven_labs_api_key";

      const voices = await aiNarrationService.getAvailableVoices();

      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty("name");
    });

    test("should call ElevenLabs voices API when key is present", async () => {
      process.env.ELEVEN_LABS_API_KEY = "sk-real-key";

      const mockVoices = {
        voices: [{ voice_id: "v1", name: "Rachel", category: "premade" }],
      };

      axios.get.mockResolvedValue({ data: mockVoices });

      const voices = await aiNarrationService.getAvailableVoices();

      expect(axios.get).toHaveBeenCalled();
      expect(voices).toEqual(mockVoices.voices);
    });
  });
});
