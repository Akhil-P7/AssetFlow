import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { ResponseEnvelopeInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const frontendUrl = configService.get<string>('app.frontendUrl', 'http://localhost:5173');

  // Global prefix for all routes: /api/v1
  app.setGlobalPrefix('api/v1');

  // CORS — allow frontend origin
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Global validation pipe — whitelist mode strips unknown fields
  // This is layer 1 of the no-self-elevation guarantee (Spec 04 §3):
  // even if a client sends { role: 'ADMIN' } in signup payload,
  // whitelist mode strips it because SignupDto has no `role` property.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter → standard error envelope
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global response envelope interceptor → { success: true, data: ... }
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  await app.listen(port);
  console.log(`🚀 AssetFlow API running on http://localhost:${port}/api/v1`);
}

bootstrap();
