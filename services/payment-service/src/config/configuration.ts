export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004'),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    name: process.env.DATABASE_NAME || 'payment_db',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/order-created',
  },
  sns: {
    topicArn: process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-southeast-1:000000000000:order-events',
  },
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:3001',
});
