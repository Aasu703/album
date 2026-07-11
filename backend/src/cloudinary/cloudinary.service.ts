import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /** Streams an in-memory file buffer to Cloudinary and returns its secure URL. */
  uploadImage(file: Express.Multer.File, folder = 'painting-marketplace'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            reject(new InternalServerErrorException(error?.message ?? 'Image upload failed.'));
            return;
          }
          resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  /** Best-effort cleanup of an uploaded asset, e.g. after a failed DB write. */
  async destroyImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      // Best-effort cleanup only; a leaked orphan asset is not worth failing the request over.
    }
  }
}
