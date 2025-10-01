import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import _ = require('lodash')

import { PayOrder, PayOrderStatus } from '../entities/pay-order.entity'
import { PayOrderDto } from '../dto'
import { ValidationService } from 'src/common/services/validation.service'

@Injectable()
export class PayOrderService {
  private readonly logger = new Logger(PayOrderService.name)

  constructor(
    @InjectRepository(PayOrder)
    private readonly payOrderRepository: Repository<PayOrder>,
    private readonly validationService: ValidationService,
  ) {}

  async savePayOrder(payOrder: PayOrder): Promise<void> {
    await this.payOrderRepository.save(payOrder)
    this.logger.log(
      `[Logbook] [quotation: ${_.get(payOrder, 'product_details.quotation_id', '')}] Pay Order with number ${payOrder.pay_order_number} successfully saved to the database`,
    )
  }

  async validatePayOrder(payOrderDto: PayOrderDto): Promise<PayOrderDto> {
    const payOrderValidationErrors = await this.validationService.validateDto(
      payOrderDto,
      PayOrderDto,
    )

    if (payOrderValidationErrors) {
      throw new Error('Validation errors detected for PayOrderDto')
    }

    return payOrderDto
  }

  async update(id: any, payOrderData: Partial<PayOrder>): Promise<PayOrder> {
    const updatedEntity = await this.payOrderRepository.preload({
      id,
      ...payOrderData,
    })
    await this.payOrderRepository.save(updatedEntity)
    return await this.payOrderRepository.findOne({
      where: { id },
    })
  }

  async getPendings() {
    return await this.payOrderRepository.manager.transaction(
      async (entityManager: EntityManager) => {
        return await entityManager
          .createQueryBuilder(PayOrder, 'pay_orders')
          .where({
            status: PayOrderStatus.PENDING,
          })
          .orderBy('created_at', 'ASC')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .getMany()
      },
    )
  }
}
