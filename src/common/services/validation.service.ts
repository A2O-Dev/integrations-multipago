import { Injectable, Logger } from '@nestjs/common'
import { validate, ValidationError } from 'class-validator'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name)

  async validateDto<T extends object>(
    dto: T,
    dtoClass: new () => T,
  ): Promise<ValidationError[] | null> {
    const instance = plainToInstance(dtoClass, dto)
    const errors = await validate(instance)

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors)

      return formattedErrors
    }

    return null
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
}
