// backend_service/models/lesson.model.js
const mongoose = require("mongoose");

const slideSchema = new mongoose.Schema({
  slide_number: { type: Number },
  template_id: { type: String },
  content: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // NARRATION SCRIPT (for video audio track)
  narration_script: {
    type: String,
  },

  // INTERACTIONS (appear during video playback)
  interactions: [
    {
      type: {
        type: String,
        required: true,
        enum: [
          "multiple_choice",
          "true_false",
          "reflection",
          "knowledge_check",
        ],
      },
      config: {
        question: String,
        options: [String],
        correct_answer: mongoose.Schema.Types.Mixed,
        explanation: String,
        required: { type: Boolean, default: true }, // All interactions required
        points: { type: Number, default: 1 },
      },
      trigger_time: { type: Number, min: 0 }, // Seconds into slide video
    },
  ],

  // VISUAL SETTINGS (for video generation)
  visual_settings: {
    theme: { type: String, default: "professional" },
    background: String,
    animations: [String],
  },
});

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    tags: [String],

    slides: [slideSchema],
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    published_at: Date,

    // VIDEO SETTINGS
    video_settings: {
      aspect_ratio: { type: String, enum: ["16:9", "9:16"], default: "16:9" },
      voice: {
        voice_id: { type: String, default: "21m00Tcm4TlvDq8ikWAM" },
        stability: { type: Number, default: 0.5 },
      },
    },

    // INTERACTIVE VIDEO (REQUIRED)
    interactive_video: {
      video_url: { type: String },
      thumbnail_url: String,
      duration: Number, // Total video duration in seconds
      status: {
        type: String,
        enum: ["generating", "completed", "failed"],
        default: "generating",
      },
      generated_at: Date,
    },

    // COMPLETION TRACKING (for future user progress)
    completion_requirements: {
      must_complete_all_interactions: { type: Boolean, default: true },
      minimum_watch_percentage: { type: Number, default: 90 }, // 90% of video
    },
  },
  {
    timestamps: true,
  }
);

// ADD to lesson.model.js - Pre-save middleware
lessonSchema.pre("save", function (next) {
  // Auto-generate slide numbers if not provided
  if (this.isModified("slides")) {
    this.slides.forEach((slide, index) => {
      if (!slide.slide_number) {
        slide.slide_number = index + 1;
      }
    });
  }
  next();
});

module.exports = mongoose.model("Lesson", lessonSchema);
