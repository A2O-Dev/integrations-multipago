import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { CommonModule } from 'src/common/common.module'

import { getKafkaConfig } from 'src/config'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [CommonModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const kafka = await getKafkaConfig(configService)
          return {
            transport: Transport.KAFKA,
            options: { ...kafka.config, producerOnlyMode: true },
          }
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
