import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePayOrdersAndQueueRegistriesTables1759344720023
  implements MigrationInterface
{
  name = 'CreatePayOrdersAndQueueRegistriesTables1759344720023'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "integrations"."queue_registries_type_enum" AS ENUM('request_pay_order')`,
    )
    await queryRunner.query(
      `CREATE TYPE "integrations"."queue_registries_status_enum" AS ENUM('pending', 'success', 'failed', 'processing')`,
    )
    await queryRunner.query(
      `CREATE TABLE "integrations"."queue_registries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "data" json NOT NULL, "type" "integrations"."queue_registries_type_enum" NOT NULL DEFAULT 'request_pay_order', "status" "integrations"."queue_registries_status_enum" NOT NULL DEFAULT 'pending', "details" json, "retry_count" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_14a073528932c245b68d4bc3d9a" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "integrations"."pay_orders_status_enum" AS ENUM('PENDING', 'COMPLETED')`,
    )
    await queryRunner.query(
      `CREATE TABLE "integrations"."pay_orders" ("id" BIGSERIAL NOT NULL, "pay_order_number" bigint NOT NULL, "status" "integrations"."pay_orders_status_enum" NOT NULL DEFAULT 'PENDING', "data" json NOT NULL, "product_details" json, "processed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7b2ae9f2601ea524fb61024de5b" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "integrations"."pay_orders"`)
    await queryRunner.query(`DROP TYPE "integrations"."pay_orders_status_enum"`)
    await queryRunner.query(`DROP TABLE "integrations"."queue_registries"`)
    await queryRunner.query(
      `DROP TYPE "integrations"."queue_registries_status_enum"`,
    )
    await queryRunner.query(
      `DROP TYPE "integrations"."queue_registries_type_enum"`,
    )
  }
}
