import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { QueueRegistryService } from './queue-registry.service'
import { ConfigModule } from '@nestjs/config'
import { QueueRegistry } from './entities/queue_registry.entity'
import { KafkaModule } from 'src/kafka/kafka.module'
import { CommonModule } from 'src/common/common.module'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([QueueRegistry]),
    KafkaModule,
    CommonModule,
  ],
  providers: [QueueRegistryService],
  exports: [QueueRegistryService],
})
export class QueueModule {}
