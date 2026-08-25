import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MIN_TRUST_KEY } from '../decorators/min-trust.decorator';
import type { RequestUser } from './request-user.interface';

@Injectable()
export class TrustGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const minTrust = this.reflector.getAllAndOverride<number>(MIN_TRUST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (minTrust === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user || user.trustLevel < minTrust) {
      throw new ForbiddenException(`Requires trust level ${minTrust}`);
    }

    return true;
  }
}
