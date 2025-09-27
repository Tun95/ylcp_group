// backend_service/services/cloudinary.service.js
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
const logger = require("../../config/logger");
const config = require("../../config");

class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: config.providers.storage.cloudinary.cloud_name,
      api_key: config.providers.storage.cloudinary.api_key,
      api_secret: config.providers.storage.cloudinary.api_secret,
    });
  }

  // Convert buffer to stream
  bufferToStream(buffer) {
    const readable = new Readable();
    readable._read = () => {}; // _read is required but you can noop it
    readable.push(buffer);
    readable.push(null);
    return readable;
  }

  // Upload video with promise support
  async uploadVideoFile(videoBuffer, filename, folder = "ylcp/videos") {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          public_id: filename.replace(/\.[^/.]+$/, ""), // Remove extension
          folder: folder,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            logger.error("Cloudinary video upload failed:", error);
            reject(error);
          } else {
            logger.info(`Video uploaded: ${result.secure_url}`);
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              duration: result.duration,
              format: result.format,
              size: result.bytes,
            });
          }
        }
      );

      this.bufferToStream(videoBuffer).pipe(stream);
    });
  }

  // Upload image (for thumbnails)
  async uploadImageFile(imageBuffer, filename, folder = "ylcp/images") {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          public_id: filename.replace(/\.[^/.]+$/, ""),
          folder: folder,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            logger.error("Cloudinary image upload failed:", error);
            reject(error);
          } else {
            logger.info(`Image uploaded: ${result.secure_url}`);
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              size: result.bytes,
            });
          }
        }
      );

      this.bufferToStream(imageBuffer).pipe(stream);
    });
  }

  // Delete file
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`File deleted: ${publicId}`);
      return result;
    } catch (error) {
      logger.error("Cloudinary delete failed:", error);
      throw error;
    }
  }
}

module.exports = new CloudinaryService();
