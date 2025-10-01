import { Controller, Inject, Logger, UseFilters } from '@nestjs/common'
import {
  ClientKafka,
  EventPattern,
  KafkaRetriableException,
  Payload,
  RpcException,
} from '@nestjs/microservices'

import { KafkaExceptionFilter } from 'src/kafka/kafka-exception.filter'
import { KAFKA_TOPICS } from 'src/kafka/kafka-topics'
import { QueueRegistryService } from 'src/queue/queue-registry.service'
import {
  QueueRegistry,
  QueueRegistryType,
} from 'src/queue/entities/queue_registry.entity'

import { TasksService } from 'src/tasks/tasks.service'
import {
  PayOrderResultDto,
  PayOrderResultStatus,
  RequestPayOrderDto,
} from './dto'

@Controller()
export class MultipagoController {
  private readonly logger = new Logger(MultipagoController.name)

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly queueRegistryService: QueueRegistryService,
    private readonly taskService: TasksService,
  ) {}

  @UseFilters(new KafkaExceptionFilter())
  @EventPattern(KAFKA_TOPICS.MULTIPAGO_REQUEST_PAY_ORDER)
  async createPayOrder(@Payload() requestPayOrderDto: RequestPayOrderDto) {
    try {
      const { errors } = requestPayOrderDto
      if (errors) {
        const payOrderResultDto: PayOrderResultDto = {
          correlation_id: requestPayOrderDto.correlation_id,
          status: PayOrderResultStatus.ERROR,
          errors: errors,
        }
        this.kafkaClient.emit(
          KAFKA_TOPICS.MULTIPAGO_PAY_ORDER_RESULT,
          payOrderResultDto,
        )
        this.logger.log(
          `Message emitted to topic ${KAFKA_TOPICS.MULTIPAGO_PAY_ORDER_RESULT}: ${JSON.stringify(payOrderResultDto)}`,
        )

        throw new RpcException('Validation errors Kafka message')
      }

      try {
        this.logger.log('Pushing new Pay Order to queue registry...')
        const queueRegistry = await this.queueRegistryService.saveQueueRegistry(
          {
            data: { ...requestPayOrderDto },
            type: QueueRegistryType.REQUEST_PAY_ORDER,
          } as QueueRegistry,
        )

        await this.taskService.executeQueueRegistry(queueRegistry)
      } catch (error) {
        throw new KafkaRetriableException(error.message)
      }
    } catch (error) {
      if (error instanceof KafkaRetriableException) {
        throw new KafkaRetriableException(error.message)
      }
      throw new RpcException(error.message)
    }
  }
}
