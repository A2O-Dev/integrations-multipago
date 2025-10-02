import {
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Entity,
} from 'typeorm'

export enum QueueRegistryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  PROCESSING = 'processing',
}

export enum QueueRegistryType {
  REQUEST_PAY_ORDER = 'request_pay_order',
}

@Entity('queue_registries')
export class QueueRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('json')
  data: any

  @Column('enum', {
    enum: QueueRegistryType,
    default: QueueRegistryType.REQUEST_PAY_ORDER,
  })
  type?: string

  @Column('enum', {
    enum: QueueRegistryStatus,
    default: QueueRegistryStatus.PENDING,
  })
  status?: QueueRegistryStatus

  @Column('json', { nullable: true })
  details?: object

  @Column('int', { default: 1 })
  retry_count?: number

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at?: Date
}
