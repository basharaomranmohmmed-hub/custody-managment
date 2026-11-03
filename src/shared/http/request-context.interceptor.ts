import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../auth/authenticated-user.js';
import { runWithRequestContext } from '../request-context/request-context.js';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestContext = { ipAddress: request.ip ?? null, userId: request.user?.id ?? null };
    return new Observable((subscriber) =>
      runWithRequestContext(requestContext, () => next.handle().subscribe(subscriber)),
    );
  }
}
