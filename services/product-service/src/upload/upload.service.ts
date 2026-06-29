import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnBase: string;

  constructor(private readonly config: ConfigService) {
    const isLocal = config.get<string>('nodeEnv') !== 'production';
    const endpoint = config.get<string>('aws.endpoint');

    this.bucket = config.get<string>('aws.mediaBucket') ?? 'ecom-media-dev';
    this.s3 = new S3Client({
      region: config.get<string>('aws.region'),
      ...(isLocal && endpoint && {
        endpoint,
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        forcePathStyle: true, // LocalStack cần pathStyle
      }),
    });

    const cloudfrontUrl = config.get<string>('aws.cloudfrontUrl');
    this.cdnBase = isLocal
      ? `${endpoint}/${this.bucket}`
      : (cloudfrontUrl || `https://s3.${config.get('aws.region')}.amazonaws.com/${this.bucket}`);
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<{ key: string; url: string }> {
    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Định dạng ảnh không hợp lệ. Chỉ chấp nhận: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Ảnh không được vượt quá 5MB');
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Public read — production nên dùng CloudFront OAI thay vì public bucket
        ACL: 'public-read',
      }),
    );

    const url = `${this.cdnBase}/${key}`;
    this.logger.log(`Uploaded: ${key}`);
    return { key, url };
  }

  async deleteImage(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted: ${key}`);
  }
}
