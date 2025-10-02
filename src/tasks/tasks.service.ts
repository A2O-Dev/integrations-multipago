import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { ClientKafka } from '@nestjs/microservices'
import _ = require('lodash')

import {
  QueueRegistry,
  QueueRegistryStatus,
  QueueRegistryType,
} from 'src/queue/entities/queue_registry.entity'
import { QueueRegistryService } from 'src/queue/queue-registry.service'

import { MULTIPAGO_ENDPOINTS } from 'src/multipago/interfaces/multipago.interface'

import { KAFKA_TOPICS } from 'src/kafka/kafka-topics'
import { MultipagoService, PayOrderService } from 'src/multipago/services'
import { PayOrder } from 'src/multipago/entities/pay-order.entity'

import { parseBoolean } from 'src/utils'
import { PayOrderResultDto, PayOrderResultStatus } from 'src/multipago/dto'

export enum PaymentMethod {
  BANK_DEPOSIT = 'Depósito bancario',
  BANK_TRANSFER = 'Transferencia bancaria',
  CASH = 'Caja',
  CREDIT_CARD = 'Tarjeta de crédito',
  MULTIPAGO_PAYMENT = 'Pago en Linea Multipago',
}

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly queueRegistryService: QueueRegistryService,
    private readonly multipagoService: MultipagoService,
    private readonly payOrderService: PayOrderService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    const executeRegistriesJob = new CronJob(
      process.env.CRON_JOB_EXECUTE_QUEUE_REGISTRIES,
      async () => await this.executeRegistries(),
      null,
      false,
      process.env.TZ || 'America/La_Paz',
    )

    this.schedulerRegistry.addCronJob(
      'executeRegistriesJob',
      executeRegistriesJob,
    )

    const enabled = parseBoolean(
      process.env.ENABLED_CRON_JOB_EXECUTE_QUEUE_REGISTRIES,
    )

    if (enabled) {
      executeRegistriesJob.start()
    }
  }

  async executeRegistries() {
    for (const type of Object.values(QueueRegistryType)) {
      await this.execute(type)
    }
  }

  async execute(type: string) {
    this.logger.log(`Getting pendings or failed for ${type} registries...`)
    const registriesToExecute =
      await this.queueRegistryService.getPendings(type)
    this.logger.log(
      `Found ${registriesToExecute.length} queued registries for execution.`,
    )
    if (registriesToExecute.length > 0) {
      this.logger.debug({ registriesToExecute })
    }

    for (const registryToExecute of registriesToExecute) {
      await this.executeQueueRegistry(registryToExecute)
    }
  }

  private async processNewPayOrder(
    registryToExecute: QueueRegistry,
  ): Promise<void> {
    const correlationId = _.get(registryToExecute, 'data.correlation_id', '')

    try {
      const { data } = registryToExecute
      this.logger.debug({ data: data })

      const payOrderDto = await this.payOrderService.validatePayOrder(
        data.payload,
      )

      const responseData = await this.multipagoService.sendRequest(
        MULTIPAGO_ENDPOINTS.CREATE_PAY_ORDER,
        payOrderDto,
      )

      this.logger.log(
        `The multipago pay order with correlation_id: ${correlationId} has been executed and verified successfully`,
      )
      await this.queueRegistryService.saveQueueRegistryAsSuccess(
        registryToExecute,
        responseData,
      )

      const messageResponsetDto: PayOrderResultDto = {
        correlation_id: data.correlation_id,
        status: PayOrderResultStatus.SUCCESS,
        result: {
          ...responseData,
        },
      }

      await this.sendKafkaMessage(
        KAFKA_TOPICS.MULTIPAGO_PAY_ORDER_RESULT,
        messageResponsetDto,
      )

      this.logger.log(
        `Multipago pay order with correlation_id: ${correlationId} has been saved to database`,
      )

      await this.payOrderService.savePayOrder({
        pay_order_number: responseData.pay_order.pay_order_number,
        data: { ...responseData },
        product_details: {
          correlation_id: data.correlation_id,
          ...data.user_data,
        },
      } as PayOrder)
    } catch (error) {
      this.logger.error(
        `Error processing new multipago pay order with correlation_id: ${correlationId}. Error: ${error.message}`,
      )
      throw error
    }
  }

  async sendKafkaMessage(
    topic: string,
    payload: any | PayOrderResultDto,
  ): Promise<void> {
    const correlationId = _.get(payload, 'correlation_id', '')

    try {
      this.kafkaClient.emit(topic, payload)

      this.logger.log(
        `Message kafka with correlation_id: ${correlationId} has been sent to topic ${topic}: ${JSON.stringify(payload)}`,
      )
    } catch (error) {
      this.logger.error(
        `Message kafka with correlation_id: ${correlationId} Failed to send topic ${topic}. Error: ${error.message}`,
      )
    }
  }

  async executeQueueRegistry(registryToExecute: QueueRegistry) {
    const correlationId = _.get(registryToExecute, 'data.correlation_id', '')

    try {
      this.logger.log(
        `Executing queue registry with correlation_id: ${correlationId} ...`,
      )
      registryToExecute.status = QueueRegistryStatus.PROCESSING
      await this.queueRegistryService.saveQueueRegistry(registryToExecute)
      await this.processNewPayOrder(registryToExecute)

      this.logger.log(
        `Queue registry with correlation_id: ${correlationId} has been processed successfully`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to execute queued registry with correlation_id: ${correlationId}`,
      )
      this.queueRegistryService.saveQueueRegistryAsFailed(registryToExecute, {
        message: error.message,
      })
    }
  }
}
