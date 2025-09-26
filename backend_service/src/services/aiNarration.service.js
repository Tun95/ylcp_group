// backend_service/services/aiNarration.service.js
const axios = require("axios");
const logger = require("../../config/logger");
const config = require("../../config");
const FirebaseStorageService = require("./firebaseStorage.service");

class AINarrationService {
  constructor() {
    this.elevenLabsApiKey = config.providers.ai.elevenLabsApiKey;
    this.openAIApiKey = config.providers.ai.openAiApiKey;

    // Validate API keys on initialization
    this.validateApiKeys();
  }

  validateApiKeys() {
    if (!this.elevenLabsApiKey) {
      logger.warn("ElevenLabs API key not configured");
    }
    if (!this.openAIApiKey) {
      logger.warn("OpenAI API key not configured");
    }
  }

  // Generate AI narration script for a slide
  async generateNarrationScript(
    slideContent,
    templateId,
    previousContext = ""
  ) {
    try {
      // If no OpenAI key, return default narration
      if (!this.openAIApiKey) {
        return this.getDefaultNarration(templateId, slideContent);
      }

      const prompt = this.buildNarrationPrompt(
        slideContent,
        templateId,
        previousContext
      );

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo", // Using 3.5 for cost efficiency
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openAIApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.error("AI narration script generation failed:", error);
      // Fallback to default narration
      return this.getDefaultNarration(templateId, slideContent);
    }
  }

  // Convert text to speech using ElevenLabs with Firebase storage
  async generateSpeech(text, voiceSettings = {}) {
    try {
      // If no ElevenLabs key, return mock data for development
      if (
        !this.elevenLabsApiKey ||
        this.elevenLabsApiKey === "your_eleven_labs_api_key"
      ) {
        logger.warn("ElevenLabs API key not configured, returning mock audio");
        return this.getMockAudioData(text); // This should return, not continue
      }

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${
          voiceSettings.voice_id || "21m00Tcm4TlvDq8ikWAM"
        }`,
        {
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: voiceSettings.stability || 0.5,
            similarity_boost: voiceSettings.similarity_boost || 0.5,
          },
        },
        {
          headers: {
            "xi-api-key": this.elevenLabsApiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
          timeout: 60000,
        }
      );

      const duration = this.estimateAudioDuration(text);

      // Save to Firebase Storage and get URL
      const filename =
        FirebaseStorageService.generateUniqueFilename("narration.mp3");
      const uploadResult = await FirebaseStorageService.uploadAudioFile(
        response.data,
        filename,
        "lesson-narrations"
      );

      return {
        audioUrl: uploadResult.url,
        duration: duration,
        filePath: uploadResult.path,
      };
    } catch (error) {
      logger.error("Speech generation failed:", error);

      // Always return mock data in test/development, only throw in production
      if (config.env === "production") {
        throw new Error("Failed to generate speech");
      }

      return this.getMockAudioData(text);
    }
  }

  // Mock audio data for development when API keys aren't configured
  getMockAudioData(text) {
    const duration = this.estimateAudioDuration(text);
    return {
      audioUrl: `https://storage.googleapis.com/your-bucket/mock-audio/${Date.now()}.mp3`,
      duration: duration,
      filePath: `mock-audio/mock_${Date.now()}.mp3`,
      isMock: true, // Flag to identify mock data
    };
  }

  // Build appropriate prompt based on template type
  buildNarrationPrompt(slideContent, templateId, previousContext) {
    const templatePrompts = {
      "title-slide": `Create a concise, engaging introduction narration (8-10 seconds).
Title: ${slideContent.title || ""}
Subtitle: ${slideContent.subtitle || ""}
Make it welcoming and set a positive tone.`,

      "content-slide": `Create an educational narration (12-15 seconds).
Title: ${slideContent.title || ""}
Content: ${slideContent.content || ""}
${previousContext ? `Context: ${previousContext}` : ""}
Be clear, engaging, and educational.`,

      "quiz-slide": `Create a quiz narration (10-12 seconds).
Question: ${slideContent.question || ""}
Options: ${slideContent.options ? slideContent.options.join(", ") : ""}
Sound conversational and encouraging.`,

      "interactive-slide": `Create an interactive guide (8-10 seconds).
Content: ${JSON.stringify(slideContent)}
Be engaging and prompt interaction.`,
    };

    const defaultPrompt = `Create a natural narration (10-12 seconds) for: 
${JSON.stringify(slideContent)}
Keep it professional yet engaging.`;

    return templatePrompts[templateId] || defaultPrompt;
  }

  // Default narrations for when AI fails
  getDefaultNarration(templateId, content) {
    const defaults = {
      "title-slide": `Welcome to: ${
        content.title || "this lesson"
      }. Let's get started.`,
      "content-slide": `Let's explore: ${content.title || "this topic"}. ${
        content.content || "Important information to consider."
      }`,
      "quiz-slide": `Question: ${
        content.question || "What do you think?"
      }. Consider your answer carefully.`,
    };
    return (
      defaults[templateId] || "Let's continue with this important content."
    );
  }

  // Estimate audio duration based on text length
  estimateAudioDuration(text) {
    const wordsPerMinute = 150;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }

  // Get available ElevenLabs voices
  async getAvailableVoices() {
    try {
      if (!this.elevenLabsApiKey) {
        return this.getMockVoices();
      }

      const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": this.elevenLabsApiKey,
        },
      });

      return response.data.voices;
    } catch (error) {
      logger.error("Failed to fetch voices:", error);
      return this.getMockVoices();
    }
  }

  getMockVoices() {
    return [
      {
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        name: "Rachel",
        category: "premade",
      },
      {
        voice_id: "AZnzlk1XvdvUeBnXmlld",
        name: "Domi",
        category: "premade",
      },
      {
        voice_id: "EXAVITQu4vr4xnSDxMaL",
        name: "Bella",
        category: "premade",
      },
    ];
  }
}

module.exports = new AINarrationService();
