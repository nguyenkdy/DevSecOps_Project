export class TokensDto {
  accessToken: string;
  refreshToken: string;
}

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}
