import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreatePaymentLogs1700000002001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'transactionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'orderId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'event',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Index để query nhanh theo transactionId và orderId
    await queryRunner.createIndex(
      'payment_logs',
      new Index('IDX_payment_logs_transaction', ['transactionId']),
    );

    await queryRunner.createIndex(
      'payment_logs',
      new Index('IDX_payment_logs_order', ['orderId']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('payment_logs', 'IDX_payment_logs_order');
    await queryRunner.dropIndex('payment_logs', 'IDX_payment_logs_transaction');
    await queryRunner.dropTable('payment_logs');
  }
}
