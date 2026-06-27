import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any, @Req() req: Request) {
    const ip =
      body.ip ||
      req.ip?.replace('::ffff:', '') ||
      '127.0.0.1';

    const navegador =
      body.navegador ||
      req.headers['user-agent'] ||
      'Navegador desconocido';

    return this.authService.login({
      username: body.username,
      password: body.password,
      ip,
      navegador,
      codigoMfa:
        typeof body.codigoMfa === 'string' && body.codigoMfa.trim() !== ''
          ? body.codigoMfa.trim()
          : null,
    });
  }
}