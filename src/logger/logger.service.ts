import { ConsoleLogger, Injectable, LoggerService } from '@nestjs/common'

@Injectable()
export class CustomLogger extends ConsoleLogger implements LoggerService {}
