import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface LoginDto {
  username: string;
  password: string;
  ip: string;
  navegador: string;
  codigoMfa: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async login(loginDto: LoginDto) {
    const result = await this.databaseService.query(
      `
      SELECT *
      FROM app.autenticar_seguro($1, $2, $3, $4, $5)
      `,
      [
        loginDto.username,
        loginDto.password,
        loginDto.ip,
        loginDto.navegador,
        loginDto.codigoMfa,
      ],
    );

    return result[0];
  }
}