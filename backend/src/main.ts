import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT')) || 3000;

  await app.listen(port);
  console.log(`Backend ejecutándose en http://localhost:${port}`);
}

bootstrap();