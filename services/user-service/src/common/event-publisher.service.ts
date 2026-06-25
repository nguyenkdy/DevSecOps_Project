import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  fullName: string;
}

/**
 * Publish domain events đến SNS topic.
 * Local: trỏ vào LocalStack endpoint (http://localhost:4566).
 * Production: bỏ endpoint, SDK tự dùng AWS thật qua IAM role.
 *
 * Downstream: Lambda subscribe topic này để gửi welcome email qua SES.
 */
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);
  private readonly sns: SNSClient;
  private readonly topicArn: string;

  constructor(private readonly config: ConfigService) {
    const isLocal = this.config.get<string>('nodeEnv') !== 'production';
    this.topicArn = this.config.get<string>('aws.snsUserTopicArn') ?? '';

    this.sns = new SNSClient({
      region: this.config.get<string>('aws.region'),
      // Chỉ override endpoint khi local (LocalStack)
      ...(isLocal && {
        endpoint: this.config.get<string>('aws.endpoint'),
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      }),
    });
  }

  async publishUserRegistered(event: UserRegisteredEvent): Promise<void> {
    if (!this.topicArn) {
      this.logger.warn('SNS_USER_TOPIC_ARN chưa cấu hình, bỏ qua publish event');
      return;
    }
    try {
      await this.sns.send(
        new PublishCommand({
          TopicArn: this.topicArn,
          Message: JSON.stringify(event),
          MessageAttributes: {
            eventType: { DataType: 'String', StringValue: 'user.registered' },
          },
        }),
      );
      this.logger.log(`Published user.registered cho ${event.email}`);
    } catch (err) {
      // Không throw — event publish thất bại không nên làm fail luồng đăng ký chính
      this.logger.error(`Lỗi publish SNS event: ${err.message}`);
    }
  }
}
