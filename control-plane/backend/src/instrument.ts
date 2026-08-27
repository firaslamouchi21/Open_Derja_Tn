import { join } from 'node:path';
import { config } from 'dotenv';
import * as Sentry from '@sentry/nestjs';

config({ path: join(process.cwd(), '../../.env') });

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: 'openderja',
});
