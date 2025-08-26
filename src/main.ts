import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(ConfigService);

  // Set global prefix
  const apiPrefix = configService.get<string>('API_PREFIX') || 'v1/api';
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'skip'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    })
  );

  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);

  console.log(
    `Application is running on: http://localhost:${port}/${apiPrefix}`
  );
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});
