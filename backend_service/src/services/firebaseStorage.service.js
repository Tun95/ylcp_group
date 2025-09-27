// backend_service/services/firebaseStorage.service.js
const admin = require("firebase-admin");
const logger = require("../../config/logger");
const config = require("../../config");

class FirebaseStorageService {
  constructor() {
    // Skip Firebase initialization in test environment
    if (process.env.NODE_ENV === "test") {
      this.isTestMode = true;
      logger.info("Firebase Storage running in test mode - no initialization");
      return;
    }

    if (!admin.apps.length) {
      // Properly handle the private key newlines
      const privateKey =
        process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ||
        config.providers.firebase.privateKey;

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.providers.firebase.projectId,
          clientEmail: config.providers.firebase.clientEmail,
          privateKey: privateKey,
        }),
        storageBucket: config.providers.firebase.storageBucket,
      });
    }

    this.bucket = admin.storage().bucket();
    this.isTestMode = false;
  }

  // Upload video file to Firebase Storage
  async uploadVideoFile(videoBuffer, filename, folder = "videos") {
    try {
      const filePath = `${folder}/${filename}`;
      const file = this.bucket.file(filePath);

      // Upload the file
      await file.save(videoBuffer, {
        metadata: {
          contentType: this.getVideoContentType(filename),
          cacheControl: "public, max-age=31536000", // Cache for 1 year
        },
        public: true,
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;

      logger.info(`Video file uploaded successfully: ${publicUrl}, Size: ${videoBuffer.length} bytes`);

      return {
        url: publicUrl,
        path: filePath,
        size: videoBuffer.length,
      };
    } catch (error) {
      logger.error("Firebase video upload failed:", error);
      throw new Error("Failed to upload video file");
    }
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
          cacheControl: "public, max-age=31536000",
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
      logger.error("Firebase audio upload failed:", error);
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

      logger.info(`Image file uploaded successfully: ${publicUrl}`);

      return {
        url: publicUrl,
        path: filePath,
        size: imageBuffer.length,
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

  // Helper method to determine video content type
  getVideoContentType(filename) {
    const extension = filename.split(".").pop().toLowerCase();
    const contentTypes = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      webm: "video/webm",
      mpeg: "video/mpeg",
      "3gp": "video/3gpp",
    };
    return contentTypes[extension] || "video/mp4";
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
      svg: "image/svg+xml",
    };
    return contentTypes[extension] || "image/jpeg";
  }

  // Helper method to determine audio content type
  getAudioContentType(filename) {
    const extension = filename.split(".").pop().toLowerCase();
    const contentTypes = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
      aac: "audio/aac",
      flac: "audio/flac",
    };
    return contentTypes[extension] || "audio/mpeg";
  }

  // Generate unique filename with timestamp
  generateUniqueFilename(originalName, prefix = "file") {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split(".").pop() || "mp4";
    return `${prefix}_${timestamp}_${randomString}.${extension}`;
  }

  // Check if file exists
  async fileExists(filePath) {
    try {
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      logger.error("Error checking file existence:", error);
      return false;
    }
  }

  // Get file metadata
  async getFileMetadata(filePath) {
    try {
      const file = this.bucket.file(filePath);
      const [metadata] = await file.getMetadata();
      return metadata;
    } catch (error) {
      logger.error("Error getting file metadata:", error);
      throw new Error("Failed to get file metadata");
    }
  }

  // Generate signed URL for temporary access
  async generateSignedUrl(filePath, expiresInMinutes = 60) {
    try {
      const file = this.bucket.file(filePath);
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      });
      return signedUrl;
    } catch (error) {
      logger.error("Error generating signed URL:", error);
      throw new Error("Failed to generate signed URL");
    }
  }

  // Create folder/directory
  async createFolder(folderPath) {
    try {
      // In Cloud Storage, folders are implicit (created when files are uploaded)
      // We create a dummy file to establish the folder structure
      const folderMarker = `${folderPath}/.folder-marker`;
      const file = this.bucket.file(folderMarker);
      await file.save(Buffer.from(''), {
        metadata: {
          contentType: 'text/plain',
        },
      });
      logger.info(`Folder created: ${folderPath}`);
      return true;
    } catch (error) {
      logger.error("Error creating folder:", error);
      throw new Error("Failed to create folder");
    }
  }

  // List files in a folder
  async listFiles(folderPath, maxResults = 100) {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: folderPath,
        maxResults: maxResults,
      });

      return files.map(file => ({
        name: file.name,
        size: file.metadata.size,
        updated: file.metadata.updated,
        contentType: file.metadata.contentType,
      }));
    } catch (error) {
      logger.error("Error listing files:", error);
      throw new Error("Failed to list files");
    }
  }
}

module.exports = new FirebaseStorageService();