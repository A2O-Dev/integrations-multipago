import {
  ArgumentsHost,
  Catch,
  Logger,
  RpcExceptionFilter,
} from '@nestjs/common'
import {
  KafkaContext,
  KafkaRetriableException,
  RpcException,
} from '@nestjs/microservices'
import { catchError, from, Observable, throwError } from 'rxjs'

@Catch(RpcException)
export class KafkaExceptionFilter implements RpcExceptionFilter<RpcException> {
  private readonly logger = new Logger(KafkaExceptionFilter.name)
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const context = host.switchToRpc().getContext<KafkaContext>()
    if (exception instanceof KafkaRetriableException) {
      this.logger.error(`[KafkaRetriableException] Error: ${exception.message}`)
      return throwError(() => exception.message)
    } else if (exception instanceof RpcException) {
      this.logger.error(`[RpcException] Error: ${exception.message}`)
      const commitOffsetsPromise = context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: context.getMessage().offset,
        },
      ])
      return from(commitOffsetsPromise).pipe(
        catchError((err) => {
          return throwError(() => err)
        }),
      )
    }
  }
}
