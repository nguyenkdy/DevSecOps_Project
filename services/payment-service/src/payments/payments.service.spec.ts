import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentService } from './payments.service';
import { Transaction, PaymentStatus, PaymentMethod } from './entities/transaction.entity';
import { PaymentLog, PaymentEvent } from './entities/payment-log.entity';
import { ConfigService } from '@nestjs/config';

const mockTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'tx-001',
    orderId: 'order-001',
    userId: 'user-001',
    amount: 150000,
    status: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.VNPAY,
    paymentRef: 'DEMO-123-ABC',
    qrCode: 'data:image/png;base64,fake',
    paymentUrl: 'https://sandbox.vnpayment.vn/paygate?vnp_TxnRef=DEMO-123-ABC',
    metadata: { demo: true },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Transaction);

describe('PaymentService', () => {
  let service: PaymentService;
  let txRepo: jest.Mocked<any>;
  let logRepo: jest.Mocked<any>;

  beforeEach(async () => {
    txRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    logRepo = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    };

    const mockConfig = {
      get: jest.fn((key: string) => {
        const cfg: Record<string, string> = {
          nodeEnv: 'test',
          'aws.region': 'ap-southeast-1',
          'aws.endpoint': 'http://localhost:4566',
          'aws.accessKeyId': 'test',
          'aws.secretAccessKey': 'test',
          'sns.topicArn': 'arn:aws:sns:ap-southeast-1:000000000000:order-events',
          'vnpay.merchantId': 'DEMO123',
        };
        return cfg[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(PaymentLog), useValue: logRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // initPayment
  // ---------------------------------------------------------------------------
  describe('initPayment', () => {
    it('trả về transactionId, qrCode, paymentUrl khi tạo thành công', async () => {
      const tx = mockTransaction();
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);

      const result = await service.initPayment('order-001', 'user-001', 150000, PaymentMethod.VNPAY);

      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('paymentUrl');
      expect(result).toHaveProperty('paymentRef');
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(txRepo.create).toHaveBeenCalledTimes(1);
      expect(txRepo.save).toHaveBeenCalledTimes(1);
    });

    it('qrCode là base64 data URL', async () => {
      const tx = mockTransaction();
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);

      const result = await service.initPayment('order-001', 'user-001', 150000, PaymentMethod.VNPAY);

      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('ghi log PaymentEvent.PAYMENT_INITIATED', async () => {
      const tx = mockTransaction();
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);

      await service.initPayment('order-001', 'user-001', 150000, PaymentMethod.VNPAY);

      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: PaymentEvent.PAYMENT_INITIATED }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // initPaymentFromEvent
  // ---------------------------------------------------------------------------
  describe('initPaymentFromEvent', () => {
    it('tạo transaction từ SQS event và ghi log ORDER_CREATED_RECEIVED', async () => {
      const tx = mockTransaction();
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);

      const result = await service.initPaymentFromEvent(
        'order-001',
        'user-001',
        150000,
        PaymentMethod.VNPAY,
      );

      expect(result).toHaveProperty('id');
      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: PaymentEvent.ORDER_CREATED_RECEIVED }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // processCallback
  // ---------------------------------------------------------------------------
  describe('processCallback', () => {
    it('cập nhật status = SUCCESS khi resultCode = "0"', async () => {
      const tx = mockTransaction();
      const savedTx = mockTransaction({ status: PaymentStatus.SUCCESS });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockResolvedValue(savedTx);

      const result = await service.processCallback('DEMO-123-ABC', '0');

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(txRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.SUCCESS }),
      );
    });

    it('cập nhật status = SUCCESS khi resultCode = "success"', async () => {
      const tx = mockTransaction();
      const savedTx = mockTransaction({ status: PaymentStatus.SUCCESS });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockResolvedValue(savedTx);

      const result = await service.processCallback('DEMO-123-ABC', 'success');

      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('cập nhật status = FAILED khi resultCode khác 0', async () => {
      const tx = mockTransaction();
      const savedTx = mockTransaction({ status: PaymentStatus.FAILED });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockResolvedValue(savedTx);

      const result = await service.processCallback('DEMO-123-ABC', '99');

      expect(result.status).toBe(PaymentStatus.FAILED);
    });

    it('throw NotFoundException nếu không tìm thấy transaction', async () => {
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.processCallback('INVALID-REF', '0')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ghi log PAYMENT_SUCCESS khi thành công', async () => {
      const tx = mockTransaction();
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockResolvedValue(mockTransaction({ status: PaymentStatus.SUCCESS }));

      await service.processCallback('DEMO-123-ABC', '0');

      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: PaymentEvent.PAYMENT_SUCCESS }),
      );
    });

    it('ghi log PAYMENT_FAILED khi thất bại', async () => {
      const tx = mockTransaction();
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockResolvedValue(mockTransaction({ status: PaymentStatus.FAILED }));

      await service.processCallback('DEMO-123-ABC', '1');

      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: PaymentEvent.PAYMENT_FAILED }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // autoApprovePayment
  // ---------------------------------------------------------------------------
  describe('autoApprovePayment', () => {
    it('gọi processCallback với resultCode "0"', async () => {
      const tx = mockTransaction();
      const savedTx = mockTransaction({ status: PaymentStatus.SUCCESS });
      txRepo.findOne.mockResolvedValue(tx);
      txRepo.save.mockResolvedValue(savedTx);

      const result = await service.autoApprovePayment('DEMO-123-ABC');

      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });
  });

  // ---------------------------------------------------------------------------
  // getTransaction
  // ---------------------------------------------------------------------------
  describe('getTransaction', () => {
    it('trả về transaction theo ID', async () => {
      const tx = mockTransaction();
      txRepo.findOne.mockResolvedValue(tx);

      const result = await service.getTransaction('tx-001');

      expect(result).toEqual(tx);
      expect(txRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tx-001' } });
    });

    it('trả về null nếu không tìm thấy', async () => {
      txRepo.findOne.mockResolvedValue(null);

      const result = await service.getTransaction('not-exist');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getTransactionByOrder
  // ---------------------------------------------------------------------------
  describe('getTransactionByOrder', () => {
    it('trả về transaction mới nhất của order', async () => {
      const tx = mockTransaction();
      txRepo.findOne.mockResolvedValue(tx);

      const result = await service.getTransactionByOrder('order-001');

      expect(result).toEqual(tx);
      expect(txRepo.findOne).toHaveBeenCalledWith({
        where: { orderId: 'order-001' },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
