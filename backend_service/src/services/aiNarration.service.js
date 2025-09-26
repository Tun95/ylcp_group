// backend_service/services/aiNarration.service.js
const axios = require("axios");
const logger = require("../../config/logger");
const config = require("../../config");

class AINarrationService {
  constructor() {
    this.elevenLabsApiKey = config.providers.ai.elevenLabsApiKey;
    this.openAIApiKey = config.providers.ai.openAiApiKey;
  }

  // Generate AI narration script for a slide
  async generateNarrationScript(
    slideContent,
    templateId,
    previousContext = ""
  ) {
    try {
      const prompt = this.buildNarrationPrompt(
        slideContent,
        templateId,
        previousContext
      );

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: { Authorization: `Bearer ${this.openAIApiKey}` },
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.error("AI narration script generation failed:", error);
      throw new Error("Failed to generate narration script");
    }
  }

  // Convert text to speech using ElevenLabs
  async generateSpeech(text, voiceSettings = {}) {
    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${
          voiceSettings.voice_id || "21m00Tcm4TlvDq8ikWAM"
        }`,
        {
          text: text,
          voice_settings: {
            stability: voiceSettings.stability || 0.5,
            similarity_boost: voiceSettings.similarity_boost || 0.5,
          },
        },
        {
          headers: {
            "xi-api-key": this.elevenLabsApiKey,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
        }
      );

      return {
        audioBuffer: response.data,
        duration: await this.estimateAudioDuration(text),
      };
    } catch (error) {
      logger.error("Speech generation failed:", error);
      throw new Error("Failed to generate speech");
    }
  }

  // Build appropriate prompt based on template type
  buildNarrationPrompt(slideContent, templateId, previousContext) {
    const templatePrompts = {
      "title-slide": `Create an engaging introduction narration for a lesson slide. 
        Title: ${slideContent.title || ""}
        Subtitle: ${slideContent.subtitle || ""}
        Keep it welcoming and set the tone for the lesson. Duration: 8-10 seconds.`,

      "content-slide": `Create an educational narration explaining this content:
        Title: ${slideContent.title || ""}
        Main Content: ${slideContent.content || ""}
        ${previousContext ? `Previous context: ${previousContext}` : ""}
        Make it clear, engaging, and educational. Duration: 12-15 seconds.`,

      "quiz-slide": `Create a narration that presents this quiz question naturally:
        Question: ${slideContent.question || ""}
        Options: ${slideContent.options ? slideContent.options.join(", ") : ""}
        Make it sound conversational and encouraging. Duration: 10-12 seconds.`,

      "interactive-slide": `Create an interactive narration that guides the user:
        Content: ${JSON.stringify(slideContent)}
        Make it engaging and prompt user interaction. Duration: 8-10 seconds.`,
    };

    const defaultPrompt = `Create a natural, educational narration for this slide content: 
      ${JSON.stringify(slideContent)}
      Keep it professional yet engaging. Duration: 10-12 seconds.`;

    return templatePrompts[templateId] || defaultPrompt;
  }

  // Estimate audio duration based on text length
  estimateAudioDuration(text) {
    const wordsPerMinute = 150; // Average speaking rate
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }
}

module.exports = new AINarrationService();
