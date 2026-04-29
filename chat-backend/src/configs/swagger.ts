import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { AppConfig } from "./root-config";

export function configSwagger(app: INestApplication, appConfig: AppConfig) {
  const appName = appConfig.name;
  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("/", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
