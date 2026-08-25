import { SetMetadata } from '@nestjs/common';

export const MIN_TRUST_KEY = 'minTrust';
export const MinTrust = (level: number) => SetMetadata(MIN_TRUST_KEY, level);
