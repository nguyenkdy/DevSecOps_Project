export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
  };
  jwt: {
    accessSecret: string;
  };
  aws: {
    region: string;
    endpoint: string;
    sqsQueueUrl: string;
  };
  externalServices: {
    productServiceUrl: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '', 10) || 3003,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '', 10) || 5432,
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    name: process.env.DATABASE_NAME || 'order_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '', 10) || 6379,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
    sqsQueueUrl: process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/order-created',
  },
  externalServices: {
    productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  },
});
