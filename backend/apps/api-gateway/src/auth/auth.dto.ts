import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLES, Rol, SessionDto, UserDto } from '@hce/contracts';

export class LoginDto {
  @ApiProperty({ example: 'admin@hce.local' })
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '********', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}

export class UserResponse implements UserDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() email: string;
  @ApiProperty() nombreCompleto: string;
  @ApiProperty({ enum: ROLES }) rol: Rol;
}

export class SessionResponse implements SessionDto {
  @ApiProperty({ type: UserResponse }) user: UserResponse;
  @ApiProperty({ format: 'date-time' }) accessTokenExpiresAt: string;
}

export class CsrfResponse {
  @ApiProperty() csrfToken: string;
}
