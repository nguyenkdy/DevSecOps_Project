import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @IsJWT({ message: 'Refresh token không hợp lệ' })
  @IsNotEmpty()
  refreshToken: string;
}
