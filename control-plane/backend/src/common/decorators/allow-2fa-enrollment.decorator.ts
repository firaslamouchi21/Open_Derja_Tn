import { SetMetadata } from '@nestjs/common';

export const ALLOW_2FA_ENROLLMENT_KEY = 'allow2faEnrollment';
export const Allow2faEnrollment = () => SetMetadata(ALLOW_2FA_ENROLLMENT_KEY, true);
