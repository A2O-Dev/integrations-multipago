import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, LessThan, EntityManager } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { ClientKafka } from '@nestjs/microservices'
import _ = require('lodash')

import {
  QueueRegistry,
  QueueRegistryStatus,
} from './entities/queue_registry.entity'

import { KAFKA_TOPICS } from 'src/kafka/kafka-topics'

@Injectable()
export class QueueRegistryService {
  private readonly logger = new Logger(QueueRegistryService.name)
  private maxRetryCount: number

  constructor(
    @InjectRepository(QueueRegistry)
    private readonly queueRegistryRepository: Repository<QueueRegistry>,
    private readonly configService: ConfigService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    this.maxRetryCount = parseInt(
      await this.configService.get('QUEUE_REGISTRY_MAX_RETRIES', '3'),
    )
  }

  async getPendings(type: string) {
    return await this.queueRegistryRepository.manager.transaction(
      async (entityManager: EntityManager) => {
        const pendings = await entityManager
          .createQueryBuilder(QueueRegistry, 'queueRegistry')
          .where({
            type,
            status: In([
              QueueRegistryStatus.PENDING,
              QueueRegistryStatus.FAILED,
            ]),
            retry_count: LessThan(this.maxRetryCount),
          })
          .orderBy('created_at', 'ASC')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .getMany()
        return pendings
      },
    )
  }

  async saveQueueRegistry(
    queueRegistry: QueueRegistry,
  ): Promise<QueueRegistry> {
    const createdQueueRegistry =
      await this.queueRegistryRepository.save(queueRegistry)

    this.logger.log(
      `Queue registry with correlation_id ${_.get(queueRegistry, 'data.correlation_id', '')} and ID ${queueRegistry.id} successfully saved to the database`,
    )
    return createdQueueRegistry
  }

  async saveQueueRegistryAsSuccess(
    queueRegistry: QueueRegistry,
    details: object,
  ): Promise<void> {
    const correlationId = _.get(queueRegistry, 'data.correlation_id', '')
    try {
      this.logger.log(
        `Update status to SUCCESS for queue registry with correlation_id ${correlationId} and ID ${queueRegistry.id}`,
      )
      queueRegistry.status = QueueRegistryStatus.SUCCESS
      queueRegistry.updated_at = new Date()
      queueRegistry.details = details
      await this.saveQueueRegistry(queueRegistry)
    } catch (error) {
      this.logger.error(
        `Error updating status to SUCCESS for queue registry with correlation_id ${correlationId} and ID ${queueRegistry.id}: ${JSON.stringify(
          error,
        )}`,
      )
      throw new Error(error)
    }
  }

  async saveQueueRegistryAsFailed(
    registryToExecute: QueueRegistry,
    details: object,
  ): Promise<void> {
    const correlationId = _.get(registryToExecute, 'data.quotation_id', '')

    try {
      registryToExecute.status = QueueRegistryStatus.FAILED
      registryToExecute.retry_count += 1
      registryToExecute.updated_at = new Date()
      registryToExecute.details = details
      await this.saveQueueRegistry(registryToExecute)

      if (registryToExecute.retry_count >= this.maxRetryCount) {
        await this.notifyExceededMaxRetries(registryToExecute)
      }

      this.logger.error(
        `Queue registry with correlation_id ${correlationId} and ID ${registryToExecute.id} marked as FAILED. Retry count: ${registryToExecute.retry_count}`,
      )
      this.logger.error(
        `Error details for queue registry with correlation_id ${correlationId} and ID ${registryToExecute.id}: ${JSON.stringify(details)}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to mark queue registry with correlation_id ${correlationId} and ID ${registryToExecute.id} as FAILED: ${error.message}`,
      )
      throw new Error(error)
    }
  }

  async notifyExceededMaxRetries(registry: QueueRegistry): Promise<void> {
    const correlationId = _.get(registry, 'data.correlation_id', '')

    try {
      const data = registry.data
      const paymentResultDto: any = {
        correlation_id: data.correlation_id,
        status: 'FAILED',
        data: {},
        errors: [
          {
            field: registry.type,
            errors: [`Exceeded max retry count of ${this.maxRetryCount}`],
          } as any,
        ],
      }

      this.kafkaClient.emit(
        KAFKA_TOPICS.MULTIPAGO_PAY_ORDER_RESULT,
        paymentResultDto,
      )
      this.logger.log(
        `Notification sent to Kafka for registry with correlation_id ${correlationId} and ID ${registry.id}: ${JSON.stringify(paymentResultDto)}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to send message to Kafka topic for registry with correlation_id ${correlationId} and ID ${registry.id}: ${KAFKA_TOPICS.MULTIPAGO_PAY_ORDER_RESULT}. Error: ${error.message}`,
      )
    }
  }
}
