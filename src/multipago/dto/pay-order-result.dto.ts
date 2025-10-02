import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'

export enum PayOrderResultStatus {
  ERROR = 'error',
  SUCCESS = 'success',
}

export class ErrorDetail {
  @IsString()
  field: string

  @IsArray()
  errors: string[] | ErrorDetail[]
}

export class PayOrderResultDto {
  @IsUUID()
  correlation_id: string

  @IsEnum(PayOrderResultStatus)
  @IsOptional()
  status: PayOrderResultStatus

  @IsObject()
  @IsOptional()
  result?: Record<string, any> | null

  @ValidateNested({ each: true })
  @Type(() => ErrorDetail)
  @IsOptional()
  errors?: ErrorDetail[]
}
