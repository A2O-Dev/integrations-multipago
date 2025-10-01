import { Inject, Injectable } from '@nestjs/common'
import { ClientKafka, ServerKafka } from '@nestjs/microservices'
import { KafkaOptions } from '@nestjs/microservices/interfaces'
import { EachMessagePayload } from 'kafkajs'
import * as retry from 'async-retry'

@Injectable()
export class CustomServerKafka extends ServerKafka {
  constructor(
    options: KafkaOptions['options'],
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {
    super(options)
  }

  async handleMessage(payload: EachMessagePayload): Promise<any> {
    const { topic, partition } = payload
    const { retries, factor, initialRetryTime } = this.getConsumerRetryOptions()
    const logger = this.logger

    logger.log(
      `[Logbook] INFO [Consumer] Consuming Kafka message from: ${JSON.stringify(
        {
          topic,
          partition,
        },
      )}`,
    )

    try {
      await retry(
        async () => {
          await super.handleMessage(payload)
        },
        {
          retries,
          factor,
          minTimeout: initialRetryTime,
          onRetry: (error, attempt) => {
            logger.error(
              `ERROR [Consumer] Error processing message. Attempt ${attempt} of ${retries}. Retrying...`,
              error,
            )
          },
        },
      )

      logger.log(`INFO [Consumer] Message processed successfully`)
    } catch (error) {
      logger.error(
        `ERROR [Consumer] Failed to process message after retries. Ignoring message and sending to DLQ...`,
      )
      await this.sendToDeadLetterQueue(payload)
    }
  }

  private getConsumerRetryOptions() {
    const { consumer } = this.options
    return (
      consumer?.retry || {
        retries: 3,
        factor: 2,
        initialRetryTime: 3000,
      }
    )
  }

  private async sendToDeadLetterQueue(payload: EachMessagePayload) {
    try {
      const message = payload.message
      const topic = 'dead-letter-queue'
      this.kafkaClient.emit(topic, message)
      this.logger.log(
        `INFO [Consumer] Message sent to DLQ: ${JSON.stringify({
          topic,
        })}`,
      )
    } catch (error) {
      this.logger.error('ERROR [Consumer] Failed to send message to DLQ', error)
    }
  }
}
