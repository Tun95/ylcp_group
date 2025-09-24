// backend_service/models/lesson.model.js
const mongoose = require("mongoose");

const slideContentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["text", "image", "video_clip", "diagram", "quiz"],
    required: true,
  },
  content: String, // Text content or image URL
  position: {
    x: Number, // Percentage positioning
    y: Number,
    width: Number,
    height: Number,
  },
  animation: {
    type: String,
    enum: ["fade", "slide", "typewriter", "none"],
    default: "fade",
  },
  duration: Number, // How long this element stays on screen
});

const slideSchema = new mongoose.Schema({
  slide_number: Number,
  background: String, // Background image/color URL
  duration: Number, // Total slide duration in seconds
  ai_narration: {
    text: String, // Script for AI to narrate
    audio_url: String, // Generated audio file URL
    duration: Number,
  },
  content_elements: [slideContentSchema],
  interactions: [
    {
      type: {
        type: String,
        enum: ["multiple_choice", "drag_drop", "click_hotspot", "text_input"],
        required: true,
      },
      trigger_time: Number, // When during slide to show interaction
      question: String,
      options: [String],
      correct_answer: String,
      feedback: String,
    },
  ],
});

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    thumbnail_url: String,
    total_duration: Number,
    slides: [slideSchema],
    ai_voice: {
      voice_id: String,
      speed: Number,
      tone: String,
    },
    generated_video_url: String, // Final rendered video (optional)
    is_published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);
