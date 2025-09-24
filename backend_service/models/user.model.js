// backend_service/models/user.model.js - User model
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      trim: true,
    },

    last_name: {
      type: String,
      trim: true,
    },

    slug: { type: String },

    email: {
      type: String,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      minlength: 8,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    phone: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    language: {
      type: String,
      default: "en",
    },

    about_me: {
      type: String,
      trim: true,
    },

    topics_of_interest: {
      type: String,
      trim: true,
    },

    profile_image: {
      type: String, // URL or path to stored image
      default: "",
    },

    is_admin: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    status: {
      type: String,
      enum: ["active", "blocked", "closed"],
      default: "active",
    },

    last_login: Date,
    password_change_at: Date,
    password_reset_token: String,
    password_reset_expires: Date,
    is_account_verified: { type: Boolean, default: false },
    account_verification_otp: { type: String },
    account_verification_otp_expires: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Create the slug before saving the user
userSchema.pre("save", async function (next) {
  if (
    this.isModified("first_name") ||
    this.isModified("last_name") ||
    !this.slug
  ) {
    let full_name = `${this.first_name} ${this.last_name}`;
    let base_slug = full_name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    // Check for duplicate slugs
    const existing_user = await this.constructor.findOne({ slug: base_slug });

    if (existing_user) {
      let counter = 1;
      while (
        await this.constructor.findOne({ slug: `${base_slug}-${counter}` })
      ) {
        counter++;
      }
      this.set("slug", `${base_slug}-${counter}`);
    } else {
      this.set("slug", base_slug);
    }
  }
  next();
});

//Verify Account
userSchema.methods.createAccountVerificationOtp = function () {
  const verification_code = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  this.account_verification_otp = verification_code;
  this.account_verification_otp_expires = Date.now() + 10 * 60 * 1000; // 10 mins
  return verification_code;
};

//Password Reset
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.password_reset_token = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.password_reset_expires = Date.now() + 10 * 60 * 1000; // 10 mins
  return resetToken;
};

//Match Password
userSchema.methods.isPasswordMatch = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
