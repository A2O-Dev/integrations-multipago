import {
  IsArray,
  IsObject,
  ValidateNested,
  IsUUID,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEmail,
} from 'class-validator'
import { Type } from 'class-transformer'

class ServiceDto {
  @IsString()
  code: string
}

class PaymentReceiverDto {
  @IsOptional()
  @IsString()
  id_local?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  ci?: string

  @IsOptional()
  @IsString()
  account_type?: string

  @IsOptional()
  @IsString()
  account_num?: string

  @IsOptional()
  @IsString()
  bank?: string
}

class PaymentDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSelectedDto)
  item_selecteds: ItemSelectedDto[]

  @IsObject()
  @ValidateNested()
  @Type(() => PaymentReceiverDto)
  payment_receiver: PaymentReceiverDto

  @IsString()
  url_confirm: string

  @IsString()
  url_fail: string

  @IsString()
  button_label_ok: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  font?: string
}

class ItemSelectedDto {
  @IsString()
  id: string

  @IsString()
  unitary_price: string

  @IsString()
  quantity: string

  @IsString()
  description: string
}

class ClientDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  last_name: string

  @IsString()
  @IsNotEmpty()
  ci: string

  @IsString()
  @IsNotEmpty()
  phone: string

  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  business_name?: string

  @IsOptional()
  @IsString()
  nit?: string
}

export class PayOrderDto {
  @IsObject()
  @ValidateNested()
  @Type(() => ServiceDto)
  service: ServiceDto

  @IsObject()
  @ValidateNested()
  @Type(() => PaymentDataDto)
  payment_data: PaymentDataDto

  @IsObject()
  @ValidateNested()
  @Type(() => ClientDto)
  client: ClientDto
}

export class RequestPayOrderDto {
  @IsUUID()
  correlation_id: string

  @IsObject()
  @ValidateNested()
  @Type(() => PayOrderDto)
  payload: PayOrderDto

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  errors?: any[]
}
