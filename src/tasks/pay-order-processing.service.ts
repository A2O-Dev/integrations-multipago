import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { ConfigService } from '@nestjs/config'
import { ClientKafka } from '@nestjs/microservices'

import { MultipagoService, PayOrderService } from 'src/multipago/services'
import { MULTIPAGO_ENDPOINTS } from 'src/multipago/interfaces/multipago.interface'
import { KAFKA_TOPICS } from 'src/kafka/kafka-topics'
import { PayOrderStatus } from 'src/multipago/entities/pay-order.entity'

import { parseBoolean } from 'src/utils'
import { PayOrderResultDto, PayOrderResultStatus } from 'src/multipago/dto'

@Injectable()
export class PayOrderProcessingService implements OnModuleInit {
  private readonly logger = new Logger(PayOrderProcessingService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly payOrderService: PayOrderService,
    private readonly multipagoService: MultipagoService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    const executePayOrdersJob = new CronJob(
      process.env.CRON_JOB_EXECUTE_PAY_ORDERS,
      async () => await this.execute(),
      null,
      false,
      process.env.TZ || 'America/La_Paz',
    )

    this.schedulerRegistry.addCronJob(
      'executePayOrdersJob',
      executePayOrdersJob,
    )

    const enabled = parseBoolean(
      process.env.ENABLED_CRON_JOB_EXECUTE_PAY_ORDERS,
    )

    if (enabled) {
      executePayOrdersJob.start()
    }
  }

  async execute() {
    this.logger.log(
      'Starting cron job to check status of pending pay orders...',
    )
    const payOrders = await this.payOrderService.getPendings()
    this.logger.log(`Found ${payOrders.length} pending pay orders.`)
    this.logger.debug({ payOrders })
    const validationStatus = process.env.MULTIPAGO_REFERENCE_STATUS
    for (const payOrder of payOrders) {
      try {
        this.logger.log(
          `Processing pay order with number: ${payOrder.pay_order_number} ...`,
        )

        const responseData = await this.multipagoService.sendRequest(
          MULTIPAGO_ENDPOINTS.GET_PAY_ORDER_BY_NUMBER,
          {
            pay_order_number: payOrder.pay_order_number,
          },
        )

        const normalizedStatus = responseData.status_order.trim().toLowerCase()
        this.logger.log(
          `Pay order with number ${payOrder.pay_order_number} status received: ${responseData.status_order}`,
        )

        if (normalizedStatus !== validationStatus) {
          await this.payOrderService.update(payOrder.id, {
            processed_at: new Date(),
          })
          this.logger.log(
            `Pay order with number ${payOrder.pay_order_number} is not confirmed.`,
          )
          continue
        }

        const topic = KAFKA_TOPICS.MULTIPAGO_PAY_ORDER_COMPLETED
        try {
          const PayOrderResultDto: PayOrderResultDto = {
            correlation_id: payOrder.product_details?.correlation_id,
            result: { ...responseData },
            status: PayOrderResultStatus.SUCCESS,
          }

          this.kafkaClient.emit(topic, PayOrderResultDto)
          this.logger.log(
            `Message sent to Kafka topic ${topic}: ${JSON.stringify(PayOrderResultDto)}`,
          )
          await this.payOrderService.update(payOrder.id, {
            status: PayOrderStatus.COMPLETED,
            processed_at: new Date(),
          })
          this.logger.log(
            `Pay order with ID ${payOrder.id} marked as COMPLETED.`,
          )
        } catch (error) {
          this.logger.error(
            `Failed to send message to Kafka topic ${topic}. Error: ${error.message}`,
          )
        }
        this.logger.log(
          `Pay order with number ${payOrder.pay_order_number} processed successfully.`,
        )
      } catch (error) {
        this.logger.error(`Failed to processing pay order: ${error.message}`)
      }
    }
  }
}
