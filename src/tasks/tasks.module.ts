import { Module } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { ConfigModule } from '@nestjs/config'
import { QueueModule } from 'src/queue/queue.module'
import { KafkaModule } from 'src/kafka/kafka.module'
import { MultipagoModule } from 'src/multipago/multipago.module'
import { PayOrderProcessingService } from './pay-order-processing.service'
import { CommonModule } from 'src/common/common.module'

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    KafkaModule,
    MultipagoModule,
    CommonModule,
  ],
  providers: [TasksService, PayOrderProcessingService],
  exports: [TasksService],
})
export class TasksModule {}
