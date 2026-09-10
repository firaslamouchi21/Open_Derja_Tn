import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../../infra/auth/token.service';
import { SystemSettingsService } from '../../infra/system/system-settings.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = await this.systemSettings.getMaintenanceMode();
    if (!mode.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.['authorization'];
    if (header?.startsWith('Bearer ')) {
      const payload = await this.tokenService.verifyAccessToken(header.slice('Bearer '.length)).catch(() => undefined);
      if (payload?.role === 'superadmin') {
        return true;
      }
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic && request.method === 'GET') {
      return true;
    }

    throw new ServiceUnavailableException({ maintenance: true, message: mode.message });
  }
}
