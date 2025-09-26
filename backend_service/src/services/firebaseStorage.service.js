// backend_service/services/firebaseStorage.service.js
const admin = require("firebase-admin");
const logger = require("../../config/logger");
const config = require("../../config");

class FirebaseStorageService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.providers.firebase.projectId,
          clientEmail: config.providers.firebase.clientEmail,
          privateKey: config.providers.firebase.privateKey,
        }),
        storageBucket: config.providers.firebase.storageBucket,
      });
    }

    this.bucket = admin.storage().bucket();
  }

  // Upload audio file to Firebase Storage
  async uploadAudioFile(audioBuffer, filename, folder = "audio") {
    try {
      const filePath = `${folder}/${filename}`;
      const file = this.bucket.file(filePath);

      // Upload the file
      await file.save(audioBuffer, {
        metadata: {
          contentType: "audio/mpeg",
          cacheControl: "public, max-age=31536000", // Cache for 1 year
        },
        public: true,
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;

      logger.info(`Audio file uploaded successfully: ${publicUrl}`);

      return {
        url: publicUrl,
        path: filePath,
        size: audioBuffer.length,
      };
    } catch (error) {
      logger.error("Firebase storage upload failed:", error);
      throw new Error("Failed to upload audio file");
    }
  }

  // Upload image file (for thumbnails, etc.)
  async uploadImageFile(imageBuffer, filename, folder = "images") {
    try {
      const filePath = `${folder}/${filename}`;
      const file = this.bucket.file(filePath);

      await file.save(imageBuffer, {
        metadata: {
          contentType: this.getImageContentType(filename),
          cacheControl: "public, max-age=31536000",
        },
        public: true,
      });

      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;

      return {
        url: publicUrl,
        path: filePath,
      };
    } catch (error) {
      logger.error("Firebase image upload failed:", error);
      throw new Error("Failed to upload image file");
    }
  }

  // Delete file from storage
  async deleteFile(filePath) {
    try {
      const file = this.bucket.file(filePath);
      await file.delete();
      logger.info(`File deleted successfully: ${filePath}`);
      return true;
    } catch (error) {
      logger.error("Firebase file deletion failed:", error);
      return false;
    }
  }

  // Helper method to determine image content type
  getImageContentType(filename) {
    const extension = filename.split(".").pop().toLowerCase();
    const contentTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    return contentTypes[extension] || "image/jpeg";
  }

  // Generate unique filename with timestamp
  generateUniqueFilename(originalName, prefix = "audio") {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split(".").pop() || "mp3";
    return `${prefix}_${timestamp}_${randomString}.${extension}`;
  }
}

module.exports = new FirebaseStorageService();
