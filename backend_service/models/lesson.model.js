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
      type: { type: String, required: true },
      config: mongoose.Schema.Types.Mixed,
      trigger_time: { type: Number, min: 0 },
    },
  ],
  ai_narration: {
    script: String,
    audio_url: String,
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

// Index for better query performance
lessonSchema.index({ created_by: 1, status: 1 });
lessonSchema.index({ category: 1, status: 1 });
lessonSchema.index({ status: 1, published_at: -1 });

module.exports = mongoose.model("Lesson", lessonSchema);
