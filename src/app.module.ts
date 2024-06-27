import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { v4 as uuidv4 } from 'uuid'

import { LoggerModule } from './logger/logger.module'
import { AppController } from './app.controller'
import { databaseOptions } from './config'

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      ...databaseOptions,
      autoLoadEntities: true,
    }),
    (() => {
      const clients = []

      let kafkaClient: any = {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
      }

      let options = null
      if ((process.env.KAFKA_ENABLED ?? 'true') === 'true') {
        options = {
          client: {
            clientId: `gs1-registry-sync-${uuidv4()}`,
            brokers: (process.env.KAFKA_BROKERS || '')
              .split(',')
              .filter((a) => a),
          },
          consumer: {
            groupId: 'gs1-registry-sync',
          },
        }
      }

      if (options !== null) {
        kafkaClient = {
          ...kafkaClient,
          options,
        }
      }

      clients.push(kafkaClient)
      return ClientsModule.register(clients)
    })(),
    LoggerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
