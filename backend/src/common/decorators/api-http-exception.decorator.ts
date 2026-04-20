import { buildTemplatedApiExceptionDecorator } from "@nanogiants/nestjs-swagger-api-exception-decorator";

export const ApiHttpException = buildTemplatedApiExceptionDecorator({
  statusCode: "$status",
  message: "$description",
});
