import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { LoggerModule } from './logger/logger.module'
import { AppController } from './app.controller'
import { QueueModule } from './queue/queue.module'
import { TasksModule } from './tasks/tasks.module'
import { MultipagoModule } from './multipago/multipago.module'
import { KafkaModule } from './kafka/kafka.module'
import { ScheduleModule } from '@nestjs/schedule'
import { databaseOptions } from './config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      ...databaseOptions,
      autoLoadEntities: true,
    }),
    KafkaModule,
    LoggerModule,
    QueueModule,
    TasksModule,
    MultipagoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
