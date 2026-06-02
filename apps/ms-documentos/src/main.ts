import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';


import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new RequestLoggerInterceptor(),
    new ApiResponseInterceptor(),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3002;

  app.use(helmet());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MS Documentos API')
    .setDescription('Microservicio de gestión documental')
    .setVersion('1.0.0')
    .addTag('documentos')
    .addTag('grupos')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  console.log(`ms-documentos escuchando en puerto ${port}`);
  console.log(`Swagger disponible en http://localhost:${port}/docs`);
}

bootstrap();
