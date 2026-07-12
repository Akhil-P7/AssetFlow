import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Signup DTO — intentionally has NO role field.
 * This is the first layer of the no-self-elevation guarantee (Spec 04 §3).
 * Even if a client sends { role: 'ADMIN' }, class-validator's whitelist
 * mode strips it before it reaches the service layer.
 */
export class SignupDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
