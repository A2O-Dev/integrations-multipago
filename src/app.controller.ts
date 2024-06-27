import { Controller, Inject, Logger } from '@nestjs/common'
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices'

@Controller()
export class AppController {
  private readonly logger = new Logger('AppController')

  constructor(@Inject('KAFKA_CLIENT') private client: ClientKafka) {}

  @MessagePattern('test')
  test(@Payload() message: any) {
    this.logger.log(message)
    this.client.emit('test-reply', message)
    return message
  }
}
