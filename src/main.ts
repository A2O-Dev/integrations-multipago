import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { v4 as uuidv4 } from 'uuid'

import { AppModule } from './app.module'
import { CustomLogger } from './logger/logger.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: new CustomLogger(),
  })

  await app.listen(process.env.PORT || 3000)

  if ((process.env.KAFKA_ENABLED ?? 'true') === 'true') {
    const kafkaApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: `gs1-integrations-${uuidv4()}`,
            brokers: (process.env.KAFKA_BROKERS || '')
              .split(',')
              .filter((a) => a),
          },
          consumer: {
            groupId: 'gs1-integrations',
          },
        },
        bufferLogs: true,
        logger: new CustomLogger(),
      },
    )
    await kafkaApp.listen()
  }

  const logger = new Logger('Bootstrap')
  logger.log(`Application is running on port: ${process.env.PORT || 3000}`)
}
bootstrap()
