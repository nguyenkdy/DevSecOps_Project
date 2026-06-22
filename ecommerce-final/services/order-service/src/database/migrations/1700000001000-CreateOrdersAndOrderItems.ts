import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateOrdersAndOrderItems1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create orders table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'totalAmount',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'shippingAddress',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'paymentMethod',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'paymentStatus',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'paymentRef',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Add indexes on orders table
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_paymentStatus',
        columnNames: ['paymentStatus'],
      }),
    );

    // Create order_items table
    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'orderId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'productId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'productName',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'productSlug',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          {
            name: 'unitPrice',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_order_items_orderId',
            columnNames: ['orderId'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
    );

    // Add indexes on order_items table
    await queryRunner.createIndex(
      'order_items',
      new TableIndex({
        name: 'idx_order_items_orderId',
        columnNames: ['orderId'],
      }),
    );

    // Add check constraint: quantity > 0
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "check_quantity_positive" CHECK ("quantity" > 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraint
    await queryRunner.query(`
      ALTER TABLE "order_items"
      DROP CONSTRAINT "check_quantity_positive"
    `);

    // Drop order_items table
    const orderItemsTable = await queryRunner.getTable('order_items');
    if (orderItemsTable) {
      await queryRunner.dropTable('order_items');
    }

    // Drop orders table
    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable) {
      await queryRunner.dropTable('orders');
    }
  }
}
