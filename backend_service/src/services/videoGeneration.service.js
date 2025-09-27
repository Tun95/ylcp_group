// backend_service/services/videoGeneration.service.js
const axios = require("axios");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../../config/logger");
const FirebaseStorageService = require("./firebaseStorage.service");
const config = require("../../config");
const { v4: uuidv4 } = require("uuid");
const { createCanvas } = require("canvas");

class VideoGenerationService {
  constructor() {
    this.elevenLabsApiKey = config.providers.ai.elevenLabs.apikey;
    this.openAIApiKey = config.providers.ai.openAi.apikey;
    this.usageTracker = new Map();
    this.monthlyLimit = 10000; // ElevenLabs free tier limit
    this.tempDir = path.join(__dirname, "../../temp");

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // MAIN METHOD: Generate complete interactive video
  async generateInteractiveVideo(lesson) {
    let tempFiles = [];

    try {
      logger.info(
        `Starting interactive video generation for lesson: ${lesson._id}`
      );

      // 1. Generate audio narrations for all slides
      const audioTracks = await this.generateAudioNarrations(lesson);
      tempFiles = tempFiles.concat(audioTracks.map((track) => track.audioPath));

      // 2. Generate visual slides for each content piece
      const visualSlides = await this.generateVisualSlides(lesson);
      tempFiles = tempFiles.concat(
        visualSlides.map((slide) => slide.imagePath)
      );

      // 3. Create video with audio + visuals + interactions
      const videoResult = await this.createVideoWithInteractions(
        lesson,
        audioTracks,
        visualSlides
      );
      tempFiles.push(videoResult.videoPath);

      // 4. Upload video to storage
      const videoBuffer = fs.readFileSync(videoResult.videoPath);
      const uploadResult = await FirebaseStorageService.uploadVideoFile(
        videoBuffer,
        `interactive_video_${Date.now()}.mp4`,
        `lessons/${lesson._id}`
      );

      // 5. Generate thumbnail from first slide
      const thumbnailUrl = await this.generateThumbnail(
        visualSlides[0].imagePath,
        lesson._id
      );

      logger.info(`Video generation completed for lesson: ${lesson._id}`);

      return {
        video_url: uploadResult.url,
        thumbnail_url: thumbnailUrl,
        duration: videoResult.duration,
        file_size: videoBuffer.length,
        interactions_timeline: videoResult.interactionsTimeline,
      };
    } catch (error) {
      logger.error("Video generation failed:", error);
      throw new Error(`Video generation failed: ${error.message}`);
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles(tempFiles);
    }
  }

  // Generate audio narrations for all slides
  async generateAudioNarrations(lesson) {
    const audioTracks = [];
    const usage = this.getUsageStats();

    if (usage.remaining <= 0) {
      throw new Error(
        `Monthly character limit exceeded (${usage.used}/${usage.limit}). Upgrade plan or wait for reset.`
      );
    }

    for (const [index, slide] of lesson.slides.entries()) {
      try {
        // Use existing script or generate new one
        let script = slide.narration_script;
        if (!script || script.trim().length === 0) {
          script = await this.generateNarrationScript(
            slide.content,
            slide.template_id
          );
        }

        // Optimize script for free tier
        const optimizedScript = this.optimizeScriptForTTS(
          script,
          slide.template_id
        );

        // Check usage limits
        if (optimizedScript.length > usage.remaining) {
          throw new Error(
            `Insufficient characters remaining. Need ${optimizedScript.length}, have ${usage.remaining}`
          );
        }

        // Generate audio for this script
        const audioResult = await this.generateSpeech(
          optimizedScript,
          lesson.settings?.ai_voice
        );
        this.trackUsage(optimizedScript.length);

        // Save audio to temporary file
        const audioPath = path.join(
          this.tempDir,
          `audio_${lesson._id}_${index}_${uuidv4()}.mp3`
        );
        fs.writeFileSync(audioPath, audioResult.audioBuffer);

        const duration =
          audioResult.duration || this.calculateAudioDuration(optimizedScript);

        audioTracks.push({
          slideNumber: index + 1,
          audioPath,
          script: optimizedScript,
          duration,
          interactions: slide.interactions || [],
          charactersUsed: optimizedScript.length,
        });

        logger.info(
          `Generated audio for slide ${index + 1}: ${duration}s, ${
            optimizedScript.length
          } chars`
        );

        // Add delay to avoid rate limiting
        await this.delay(1000);
      } catch (error) {
        logger.error(`Failed to generate audio for slide ${index + 1}:`, error);
        throw new Error(
          `Slide ${index + 1} audio generation failed: ${error.message}`
        );
      }
    }

    return audioTracks;
  }

  // Generate narration script using OpenAI
  async generateNarrationScript(content, templateId) {
    const prompts = {
      "title-slide": `Create a concise, engaging introduction (8-10 seconds) for: "${
        content.title || "Our Lesson"
      }". ${
        content.subtitle
          ? `Include: "${content.subtitle}"`
          : "Make it welcoming and set a positive tone."
      }`,

      "content-slide": `Create an educational narration (12-15 seconds) explaining: "${
        content.title || "this concept"
      }". Key points: ${
        content.content || "Important information"
      }. Be clear and engaging.`,

      "quiz-slide": `Create a quiz narration (10-12 seconds) for this question: "${
        content.question || "What do you think?"
      }" ${
        content.options ? `Options: ${content.options.join(", ")}.` : ""
      } Sound conversational and encouraging.`,

      "interactive-slide": `Create an interactive guide (8-10 seconds) for: ${
        content.instructions || "this activity"
      }. Be engaging and prompt interaction.`,
    };

    const defaultPrompt = `Create a natural narration (10-12 seconds) for: ${JSON.stringify(
      content
    )}. Keep it professional yet engaging.`;
    const prompt = prompts[templateId] || defaultPrompt;

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openAIApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.warn(
        "OpenAI script generation failed, using fallback:",
        error.message
      );
      return this.getFallbackScript(content, templateId);
    }
  }

  // Generate speech audio using ElevenLabs
  async generateSpeech(text, voiceSettings = {}) {
    // Use mock data if API keys aren't configured (for development)
    if (
      !this.elevenLabsApiKey ||
      this.elevenLabsApiKey === "your_eleven_labs_api_key"
    ) {
      return this.getMockAudioData(text);
    }

    try {
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
            style: voiceSettings.style || 0.3,
            use_speaker_boost: voiceSettings.use_speaker_boost !== false,
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

      const duration = this.calculateAudioDuration(text);

      return {
        audioBuffer: response.data,
        duration: duration,
        format: "mp3",
      };
    } catch (error) {
      logger.error(
        "ElevenLabs TTS failed:",
        error.response?.data || error.message
      );

      // Fallback to mock data in development, throw in production
      if (config.env === "production") {
        throw new Error(
          `Speech generation failed: ${
            error.response?.data?.detail || error.message
          }`
        );
      } else {
        logger.warn("Using mock audio data due to API failure");
        return this.getMockAudioData(text);
      }
    }
  }

  // Generate visual slides using HTML-to-image approach
  async generateVisualSlides(lesson) {
    const visualSlides = [];

    for (const [index, slide] of lesson.slides.entries()) {
      try {
        const imagePath = await this.generateSlideImage(
          slide,
          index,
          lesson.video_settings
        );
        visualSlides.push({
          slideNumber: index + 1,
          imagePath,
          duration: slide.duration || 5, // Default duration if not specified
          content: slide.content,
        });
      } catch (error) {
        logger.error(
          `Failed to generate visual for slide ${index + 1}:`,
          error
        );
        throw new Error(
          `Slide ${index + 1} visual generation failed: ${error.message}`
        );
      }
    }

    return visualSlides;
  }

  // Generate individual slide image
  async generateSlideImage(slide, index, videoSettings) {
    const imagePath = path.join(this.tempDir, `slide_${index}_${uuidv4()}.png`);

    // For now, create a simple HTML template and convert to image
    // In production, you might use Puppeteer, Canvas, or a service like Canva API
    const htmlContent = this.generateSlideHTML(slide, videoSettings);

    // This is a simplified version - you'd need a proper HTML-to-image converter
    // For now, we'll create a placeholder image
    await this.createPlaceholderImage(imagePath, slide, index);

    return imagePath;
  }

  // Create video with FFmpeg (audio + visuals + interactions)
  async createVideoWithInteractions(lesson, audioTracks, visualSlides) {
    const outputPath = path.join(
      this.tempDir,
      `video_${lesson._id}_${uuidv4()}.mp4`
    );
    const interactionsTimeline = [];
    let totalDuration = 0;

    // Create input file for FFmpeg
    const inputListPath = path.join(this.tempDir, `input_list_${uuidv4()}.txt`);
    let inputListContent = "";

    // Prepare slides with their audio
    for (let i = 0; i < visualSlides.length; i++) {
      const slide = visualSlides[i];
      const audioTrack = audioTracks.find(
        (track) => track.slideNumber === slide.slideNumber
      );
      const slideDuration = audioTrack ? audioTrack.duration : slide.duration;

      // Add visual slide as image stream
      inputListContent += `file '${slide.imagePath}'\n`;
      inputListContent += `duration ${slideDuration}\n`;

      // Add interactions for this slide
      if (audioTrack && audioTrack.interactions) {
        audioTrack.interactions.forEach((interaction) => {
          interactionsTimeline.push({
            slide_number: slide.slideNumber,
            trigger_time: totalDuration + (interaction.trigger_time || 0),
            type: interaction.type,
            config: interaction.config,
            position: interaction.position,
          });
        });
      }

      totalDuration += slideDuration;
    }

    // Write input list file
    fs.writeFileSync(inputListPath, inputListContent);
    tempFiles.push(inputListPath);

    // Combine audio tracks into single audio file
    const combinedAudioPath = await this.combineAudioTracks(
      audioTracks,
      lesson._id
    );
    tempFiles.push(combinedAudioPath);

    // Use FFmpeg to create video (simplified - you'd need proper FFmpeg commands)
    await this.createVideoWithFFmpeg(
      inputListPath,
      combinedAudioPath,
      outputPath,
      lesson.video_settings
    );

    return {
      videoPath: outputPath,
      duration: totalDuration,
      interactionsTimeline,
    };
  }

  // Combine all audio tracks into single file
  async combineAudioTracks(audioTracks, lessonId) {
    const outputPath = path.join(
      this.tempDir,
      `combined_audio_${lessonId}_${uuidv4()}.mp3`
    );

    // Create FFmpeg command to concatenate audio files
    const audioListPath = path.join(this.tempDir, `audio_list_${uuidv4()}.txt`);
    const audioListContent = audioTracks
      .map((track) => `file '${track.audioPath}'`)
      .join("\n");
    fs.writeFileSync(audioListPath, audioListContent);
    tempFiles.push(audioListPath);

    // Execute FFmpeg command (simplified)
    await this.executeFFmpegCommand(
      `-f concat -safe 0 -i "${audioListPath}" -c copy "${outputPath}"`
    );

    return outputPath;
  }

  // Create video using FFmpeg
  async createVideoWithFFmpeg(
    inputListPath,
    audioPath,
    outputPath,
    videoSettings
  ) {
    const resolution = this.getResolutionSettings(videoSettings?.resolution);

    const command =
      `ffmpeg -f concat -safe 0 -i "${inputListPath}" -i "${audioPath}" ` +
      `-c:v libx264 -r 30 -pix_fmt yuv420p ${resolution} ` +
      `-c:a aac -shortest -y "${outputPath}"`;

    await this.executeFFmpegCommand(command);
  }

  // Generate thumbnail from first slide image
  async generateThumbnail(slideImagePath, lessonId) {
    try {
      const thumbnailPath = path.join(
        this.tempDir,
        `thumbnail_${lessonId}_${uuidv4()}.jpg`
      );

      // Use FFmpeg to create thumbnail
      await this.executeFFmpegCommand(
        `-i "${slideImagePath}" -vframes 1 -q:v 2 "${thumbnailPath}"`
      );

      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      const uploadResult = await FirebaseStorageService.uploadImageFile(
        thumbnailBuffer,
        `lessons/${lessonId}/thumbnail.jpg`
      );

      // Clean up temporary thumbnail file
      fs.unlinkSync(thumbnailPath);

      return uploadResult.url;
    } catch (error) {
      logger.error("Thumbnail generation failed:", error);
      // Return a default thumbnail URL or fallback
      return "https://storage.googleapis.com/your-bucket/default-thumbnail.jpg";
    }
  }

  // Helper methods
  optimizeScriptForTTS(script, templateId) {
    const optimizations = {
      "title-slide": (s) =>
        s
          .replace(/\b(Welcome to|Let's get started|In this lesson)\b/gi, "")
          .trim(),
      "content-slide": (s) =>
        s
          .replace(
            /\b(Let's explore|Now we'll learn|Important to note)\b/gi,
            ""
          )
          .trim(),
      "quiz-slide": (s) =>
        s.replace(/\b(Question:|Options:|Consider your answer)\b/gi, "").trim(),
    };

    let optimized = script
      .replace(/\s+/g, " ")
      .replace(/\.{2,}/g, ".")
      .replace(/,/g, ".")
      .trim();

    if (optimizations[templateId]) {
      optimized = optimizations[templateId](optimized);
    }

    // Ensure minimum and maximum length
    if (optimized.length < 20) {
      optimized = "Continue with this important content.";
    }

    return optimized.substring(0, 500); // Safety cap
  }

  calculateAudioDuration(text) {
    const wordsPerMinute = 150;
    const wordCount = text.split(/\s+/).length;
    const minutes = wordCount / wordsPerMinute;
    return Math.max(3, Math.ceil(minutes * 60)); // Minimum 3 seconds per slide
  }

  getFallbackScript(content, templateId) {
    const fallbacks = {
      "title-slide": `Welcome to ${
        content.title || "our lesson"
      }. Let's begin.`,
      "content-slide": `${content.title || "This topic"}. ${
        content.content || "Important information."
      }`,
      "quiz-slide": `Question: ${
        content.question || "What do you think?"
      }. Consider your answer.`,
    };

    return fallbacks[templateId] || "Let's continue with this content.";
  }

  getMockAudioData(text) {
    const duration = this.calculateAudioDuration(text);
    return {
      audioBuffer: Buffer.from(`mock_audio_${text.substring(0, 10)}`),
      duration: duration,
      isMock: true,
    };
  }

  generateSlideHTML(slide, videoSettings) {
    // Basic HTML template for the slide
    return `
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 40px; 
              font-family: Arial, sans-serif;
              background: ${slide.visual_elements?.background || "#f0f2f5"};
              color: #333;
              width: ${
                videoSettings?.aspect_ratio === "9:16" ? "720" : "1280"
              }px;
              height: ${
                videoSettings?.aspect_ratio === "9:16" ? "1280" : "720"
              }px;
            }
            .title { font-size: 48px; font-weight: bold; margin-bottom: 20px; }
            .content { font-size: 32px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="title">${slide.content?.title || "Slide Title"}</div>
          <div class="content">${
            slide.content?.content || "Slide content goes here..."
          }</div>
        </body>
      </html>
    `;
  }

  async createPlaceholderImage(imagePath, slide, index) {
    // Create a simple placeholder image using a Node.js library or service
    // For now, we'll create a basic colored image as placeholder
    const width = 1280,
      height = 720;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = "#ecf0f1";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      slide.content?.title || `Slide ${index + 1}`,
      width / 2,
      height / 2 - 50
    );

    // Content
    ctx.font = "32px Arial";
    ctx.fillText(
      slide.content?.content || "Content goes here",
      width / 2,
      height / 2 + 50
    );

    // Save image
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(imagePath, buffer);
  }

  getResolutionSettings(resolution) {
    const resolutions = {
      "720p": "-s 1280x720",
      "1080p": "-s 1920x1080",
      "4K": "-s 3840x2160",
    };
    return resolutions[resolution] || resolutions["1080p"];
  }

  async executeFFmpegCommand(command) {
    return new Promise((resolve, reject) => {
      exec(`ffmpeg ${command}`, (error, stdout, stderr) => {
        if (error) {
          logger.error(`FFmpeg error: ${stderr}`);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  // Usage tracking for free tier
  trackUsage(characters) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentUsage = this.usageTracker.get(currentMonth) || 0;
    const newUsage = currentUsage + characters;
    this.usageTracker.set(currentMonth, newUsage);
    return newUsage;
  }

  getUsageStats() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const used = this.usageTracker.get(currentMonth) || 0;
    return {
      used,
      remaining: Math.max(0, this.monthlyLimit - used),
      limit: this.monthlyLimit,
      percentage: (used / this.monthlyLimit) * 100,
    };
  }

  async cleanupTempFiles(files) {
    for (const file of files) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          logger.warn(`Could not delete temp file: ${file}`, error.message);
        }
      }
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get available voices from ElevenLabs
  async getAvailableVoices() {
    if (!this.elevenLabsApiKey) {
      return this.getMockVoices();
    }

    try {
      const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": this.elevenLabsApiKey,
        },
        timeout: 10000,
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
        description: "Clear and professional female voice",
      },
      {
        voice_id: "AZnzlk1XvdvUeBnXmlld",
        name: "Domi",
        category: "premade",
        description: "Energetic and engaging female voice",
      },
    ];
  }
}

module.exports = new VideoGenerationService();
