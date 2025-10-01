import { forwardRef, Module } from '@nestjs/common'
import { HttpModule, HttpService } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { TypeOrmModule } from '@nestjs/typeorm'

import { KafkaModule } from 'src/kafka/kafka.module'
import { QueueModule } from 'src/queue/queue.module'
import { MultipagoController } from './multipago.controller'
import { MultipagoService, PayOrderService } from './services'
import { PayOrder } from './entities/pay-order.entity'
import { ValidationService } from 'src/common/services/validation.service'
import { CommonModule } from 'src/common/common.module'
import { TasksModule } from 'src/tasks/tasks.module'

@Module({
  imports: [
    ConfigModule,
    CacheModule.register(),
    HttpModule.registerAsync({
      imports: [CommonModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        baseURL: await configService.get('MULTIPAGO_URL'),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }),
    }),
    KafkaModule,
    QueueModule,
    TypeOrmModule.forFeature([PayOrder]),
    CommonModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [MultipagoController],
  providers: [
    {
      provide: 'MULTIPAGO_HTTP_SERVICE',
      useExisting: HttpService,
    },
    ValidationService,
    MultipagoService,
    PayOrderService,
  ],
  exports: ['MULTIPAGO_HTTP_SERVICE', MultipagoService, PayOrderService],
})
export class MultipagoModule {}
