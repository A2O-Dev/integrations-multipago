import {
  Controller,
  Logger,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common'

import { QueueRegistryService } from 'src/queue/queue-registry.service'
import {
  QueueRegistry,
  QueueRegistryType,
} from 'src/queue/entities/queue_registry.entity'
import { TasksService } from 'src/tasks/tasks.service'
import { RequestPayOrderDto } from './multipago/dto'

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name)

  constructor(
    private readonly queueRegistryService: QueueRegistryService,
    private readonly taskService: TasksService,
  ) {}

  @Post('request-pay-order')
  async createPayOrder(@Body() requestPayOrderDto: RequestPayOrderDto) {
    try {
      const { errors, correlation_id } = requestPayOrderDto

      if (errors) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Validation errors in request',
            errors: errors,
            correlation_id: correlation_id,
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      try {
        this.logger.log('Pushing new Pay Order to queue registry...')
        const queueRegistry = await this.queueRegistryService.saveQueueRegistry(
          {
            data: { ...requestPayOrderDto },
            type: QueueRegistryType.REQUEST_PAY_ORDER,
          } as QueueRegistry,
        )

        await this.taskService.executeQueueRegistry(queueRegistry)

        return {
          status: HttpStatus.ACCEPTED,
          message: 'Pay order request processed successfully',
          correlation_id: correlation_id,
          queue_registry_id: queueRegistry.id,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        this.logger.error(`Queue processing error: ${error.message}`)

        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal server error',
            message: error.message,
            correlation_id: correlation_id,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }

      this.logger.error(`Unexpected error: ${error.message}`)
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Unexpected error occurred',
          correlation_id: requestPayOrderDto.correlation_id,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
