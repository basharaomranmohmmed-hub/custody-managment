import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { assertRole } from './roles.guard.js';

@Injectable()
export class AuditorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return assertRole(context, ['AUDITOR']);
  }
}
