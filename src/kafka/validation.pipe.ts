import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  Logger,
  Type,
} from '@nestjs/common'
import { validate, ValidationError } from 'class-validator'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name)

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value
    }
    this.logger.log(`Validating Kafka Message: ${JSON.stringify(value)}`)

    const object = plainToInstance(metatype, value)
    const errors = await validate(object)
    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors)
      this.logger.error(
        `Validation errors detected in Kafka message: ${JSON.stringify(formattedErrors)}`,
      )
      this.logger.debug('Validation error details:', errors)
      return { ...value, errors: formattedErrors }
    }

    this.logger.log('Validation successful for Kafka message')
    return value
  }

  private formatErrors(errors: ValidationError[]): any {
    return errors.map((err) => ({
      field: err.property,
      errors: [
        ...Object.values(err.constraints || {}),
        ...this.formatErrors(err.children || []),
      ],
    }))
  }

  private toValidate(metatype: Type<any>): boolean {
    const types: Type<any>[] = [String, Boolean, Number, Array, Object]
    if (metatype.name === 'KafkaContext') {
      return false
    }
    return !types.includes(metatype)
  }
}
