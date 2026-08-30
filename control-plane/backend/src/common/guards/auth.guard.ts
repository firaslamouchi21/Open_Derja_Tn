import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infra/database/prisma.service';
import { TokenService } from '../../infra/auth/token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../decorators/allow-unverified-email.decorator';
import { ALLOW_2FA_ENROLLMENT_KEY } from '../decorators/allow-2fa-enrollment.decorator';
import type { RequestUser } from './request-user.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const bearerToken = this.extractBearerToken(request);

    if (isPublic) {
      if (bearerToken) {
        const user = await this.resolveUser(bearerToken).catch(() => undefined);
        if (user) {
          request.user = user;
        }
      }
      return true;
    }

    if (!bearerToken) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.resolveUser(bearerToken);
    request.user = user;

    if (user.twofaPending) {
      const allow2faEnrollment = this.reflector.getAllAndOverride<boolean>(ALLOW_2FA_ENROLLMENT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!allow2faEnrollment) {
        throw new ForbiddenException('Two-factor enrollment required before this account can be used');
      }
      return true;
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      const allowUnverifiedEmail = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_EMAIL_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!user.emailConfirmed && !allowUnverifiedEmail) {
        throw new ForbiddenException('Email verification required');
      }
    }

    return true;
  }

  private extractBearerToken(request: { headers: Record<string, string | undefined> }): string | undefined {
    const header = request.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length);
  }

  private async resolveUser(bearerToken: string): Promise<RequestUser> {
    const payload = await this.tokenService.verifyAccessToken(bearerToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid session');
    }
    if (user.tokenVersion !== payload.ver) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: user.id,
      role: user.role,
      trustLevel: user.trustLevel,
      emailConfirmed: user.emailConfirmed,
      sessionId: payload.sid,
      twofaPending: payload.twofa === 'pending',
    };
  }
}
