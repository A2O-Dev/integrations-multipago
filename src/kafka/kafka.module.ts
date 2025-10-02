import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { CommonModule } from 'src/common/common.module'

import { getKafkaConfig } from 'src/config'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [CommonModule],
        useFactory: async () => {
          const kafka = getKafkaConfig()
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
