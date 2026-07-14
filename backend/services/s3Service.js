import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../helpers/logger.js';
import env from '../config/env.js';

/**
 * S3 Service for image uploads
 * In production, this uses AWS S3. In development, files are stored locally.
 * This abstraction allows easy switching between local and S3 storage.
 */

const S3Service = {
  /**
   * Upload a file to storage
   * @param {Object} file - The file object from multer
   * @returns {Promise<string>} - The URL/path of the uploaded file
   */
  async uploadFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;

    // For production, upload to S3 if a bucket is configured
    if (env.nodeEnv === 'production' && env.aws.s3Bucket) {
      return await this.uploadToS3(file, filename);
    }

    // For development, store locally
    return await this.uploadLocally(file, filename);
  },

  /**
   * Upload to AWS S3
   */
  async uploadToS3(file, filename) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

      const s3Config = { region: env.aws.region };
      if (env.aws.accessKeyId && env.aws.secretAccessKey) {
        s3Config.credentials = {
          accessKeyId: env.aws.accessKeyId,
          secretAccessKey: env.aws.secretAccessKey,
        };
      }
      const s3Client = new S3Client(s3Config);

      const fileContent = fs.readFileSync(file.path);

      const params = {
        Bucket: env.aws.s3Bucket,
        Key: `students/${filename}`,
        Body: fileContent,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      await s3Client.send(new PutObjectCommand(params));

      // Clean up temp file
      fs.unlinkSync(file.path);

      const url = `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/students/${filename}`;

      logger.info(`File uploaded to S3: ${url}`);

      return url;
    } catch (error) {
      logger.error('S3 upload failed:', error.message);
      // Fallback to local upload
      return await this.uploadLocally(file, filename);
    }
  },

  /**
   * Upload locally for development
   */
  async uploadLocally(file, filename) {
    const uploadDir = path.join('uploads', 'students');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const destination = path.join(uploadDir, filename);
    fs.copyFileSync(file.path, destination);
    fs.unlinkSync(file.path);

    const url = `/uploads/students/${filename}`;
    logger.info(`File stored locally: ${url}`);

    return url;
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(fileUrl) {
    if (!fileUrl) return;

    try {
      if (fileUrl.includes('amazonaws.com')) {
        // Delete from S3
        const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

        const s3Config = { region: env.aws.region };
        if (env.aws.accessKeyId && env.aws.secretAccessKey) {
          s3Config.credentials = {
            accessKeyId: env.aws.accessKeyId,
            secretAccessKey: env.aws.secretAccessKey,
          };
        }
        const s3Client = new S3Client(s3Config);

        const key = fileUrl.split('.amazonaws.com/')[1];
        await s3Client.send(new DeleteObjectCommand({
          Bucket: env.aws.s3Bucket,
          Key: key,
        }));

        logger.info(`File deleted from S3: ${key}`);
      } else {
        // Delete locally
        const filePath = path.join('uploads', fileUrl.replace('/uploads/', ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`File deleted locally: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to delete file: ${fileUrl}`, error.message);
    }
  },
};

export default S3Service;
