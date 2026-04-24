import { Global, Module } from "@nestjs/common";
import { DatabaseSchemaService } from "./database-schema.service";

@Global()
@Module({
  providers: [DatabaseSchemaService],
})
export class DatabaseModule { }
