import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePayOrdersAndQueueRegistriesTables1759277717950
  implements MigrationInterface
{
  name = 'CreatePayOrdersAndQueueRegistriesTables1759277717950'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."queue_registries_type_enum" AS ENUM('create_order', 'debtor_invoice', 'incoming_payment', 'electronic_invoice', 'create_pay_order')`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."queue_registries_status_enum" AS ENUM('pending', 'success', 'failed', 'processing')`,
    )
    await queryRunner.query(
      `CREATE TABLE "queue_registries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "data" json NOT NULL, "type" "public"."queue_registries_type_enum" NOT NULL DEFAULT 'create_order', "status" "public"."queue_registries_status_enum" NOT NULL DEFAULT 'pending', "details" json, "retry_count" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_14a073528932c245b68d4bc3d9a" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."pay_orders_status_enum" AS ENUM('PENDING', 'COMPLETED')`,
    )
    await queryRunner.query(
      `CREATE TABLE "pay_orders" ("id" BIGSERIAL NOT NULL, "pay_order_number" bigint NOT NULL, "status" "public"."pay_orders_status_enum" NOT NULL DEFAULT 'PENDING', "data" json NOT NULL, "product_details" json, "processed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b2ae9f2601ea524fb61024de5b" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pay_orders"`)
    await queryRunner.query(`DROP TYPE "public"."pay_orders_status_enum"`)
    await queryRunner.query(`DROP TABLE "queue_registries"`)
    await queryRunner.query(`DROP TYPE "public"."queue_registries_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."queue_registries_type_enum"`)
  }
}
