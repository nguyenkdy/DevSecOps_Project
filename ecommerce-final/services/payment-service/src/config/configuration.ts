export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004'),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    name: process.env.DATABASE_NAME || 'payment_db',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/order-created',
  },
  sns: {
    topicArn: process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-southeast-1:000000000000:order-events',
  },
  vnpay: {
    sandbox: process.env.VNPAY_SANDBOX === 'true',
    merchantId: process.env.VNPAY_MERCHANT_ID || 'DEMO123',
    hashSecret: process.env.VNPAY_HASH_SECRET || 'DEMOSECRET123',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3005/payment-callback',
  },
});
