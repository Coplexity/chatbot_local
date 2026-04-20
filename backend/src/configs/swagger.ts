import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configSwagger(app: INestApplication) {
  const configService = app.get<ConfigService>(ConfigService);
  const appName = configService.get("app.name");
  const config = new DocumentBuilder()
    .setTitle(appName)
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
