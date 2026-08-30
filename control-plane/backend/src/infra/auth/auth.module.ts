import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailOtpService } from './email-otp.service';
import { TotpService } from './totp.service';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthService } from './oauth/oauth.service';
import { GithubOAuthProvider } from './oauth/github.provider';
import { GoogleOAuthProvider } from './oauth/google.provider';

@Module({
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    EmailOtpService,
    TotpService,
    OAuthService,
    GithubOAuthProvider,
    GoogleOAuthProvider,
  ],
  exports: [AuthService],
})
export class AuthModule {}
