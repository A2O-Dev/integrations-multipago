import {
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Entity,
} from 'typeorm'

export enum PayOrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

@Entity('pay_orders')
export class PayOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number

  @Column({ type: 'bigint' })
  pay_order_number: number

  @Column('enum', {
    enum: PayOrderStatus,
    default: PayOrderStatus.PENDING,
  })
  status?: PayOrderStatus

  @Column('json')
  data: any

  @Column('json', { nullable: true })
  product_details?: any

  @Column({ type: 'timestamp', nullable: true })
  processed_at?: Date

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date
}
