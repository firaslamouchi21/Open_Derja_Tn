import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class OtpConfirmDto {
  @IsString()
  @MinLength(6)
  code!: string;
}

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  code!: string;

  @IsString()
  @MinLength(12)
  newPassword!: string;
}

export class TotpConfirmDto {
  @IsString()
  code!: string;
}

export class AcceptInviteDto {
  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  password?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
