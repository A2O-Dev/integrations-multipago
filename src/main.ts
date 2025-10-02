import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { MicroserviceOptions } from '@nestjs/microservices'

import { AppModule } from './app.module'
import { CustomLogger } from './logger/logger.service'
import { getKafkaConfig } from './config'
import { CustomServerKafka } from './kafka/custom-server-kafka'

async function bootstrap() {
  const customLogger = new CustomLogger()
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: new CustomLogger(),
  })

  customLogger.setLogLevels(
    process.env.APP_ENV === 'develop'
      ? ['log', 'error', 'warn', 'debug', 'verbose', 'fatal']
      : ['log', 'error', 'warn'],
  )
  app.useLogger(customLogger)

  const { isEnabled: kafkaEnabled, config: kafkaConfig } = getKafkaConfig()

  if (kafkaEnabled) {
    const kafkaClient = app.get('KAFKA_CLIENT')
    try {
      await kafkaClient.connect()
      customLogger.log('Kafka connected successfully')
    } catch (err) {
      customLogger.error('Failed to connect to Kafka. Exiting process...', err)
      process.exit(1)
    }
    app.connectMicroservice<MicroserviceOptions>(
      {
        strategy: new CustomServerKafka(kafkaConfig, kafkaClient),
      },
      { inheritAppConfig: true },
    )
  }
  await app.startAllMicroservices()
  await app.listen(process.env.PORT || 3000)

  const logger = new Logger('Bootstrap')
  logger.log(`Application is running on port: ${process.env.PORT || 3000}`)
}
bootstrap()
