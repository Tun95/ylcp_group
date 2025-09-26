// backend_service/models/lesson.model.js
const mongoose = require("mongoose");

const slideSchema = new mongoose.Schema({
  slide_number: { type: Number, required: true },
  template_id: { type: String, required: true },
  duration: { type: Number, required: true, min: 1 },
  content: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  interactions: [
    {
      type: { type: String, required: true }, // 'multiple_choice', 'true_false', 'reflection'
      config: mongoose.Schema.Types.Mixed,
      trigger_time: { type: Number, min: 0 },
    },
  ],
  ai_narration: {
    script: { type: String, required: true },
    audio_url: String,
    status: {
      type: String,
      enum: ["pending", "generating", "completed", "failed"],
      default: "pending",
    },
    voice_settings: {
      voice_id: { type: String, default: "21m00Tcm4TlvDq8ikWAM" }, // ElevenLabs default
      stability: { type: Number, default: 0.5 },
      similarity_boost: { type: Number, default: 0.5 },
    },
  },
  visual_elements: {
    background: String,
    animations: [String],
    transitions: String,
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
    thumbnail: {
      type: String,
      default: "",
    },
    estimated_duration: {
      type: Number,
      min: 0,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
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
    settings: {
      ai_voice: {
        voice_id: { type: String, default: "21m00Tcm4TlvDq8ikWAM" },
        stability: { type: Number, default: 0.5 },
        similarity_boost: { type: Number, default: 0.5 },
      },
      auto_generate_narration: { type: Boolean, default: true },
      interaction_frequency: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
      },
    },
    narration_status: {
      type: String,
      enum: ["not_started", "generating", "completed", "failed"],
      default: "not_started",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total duration calculation
lessonSchema.virtual("total_duration").get(function () {
  return this.slides.reduce((total, slide) => total + slide.duration, 0);
});

// Pre-save middleware to update estimated_duration
lessonSchema.pre("save", function (next) {
  if (this.isModified("slides")) {
    this.estimated_duration = this.total_duration;
  }
  next();
});

module.exports = mongoose.model("Lesson", lessonSchema);
