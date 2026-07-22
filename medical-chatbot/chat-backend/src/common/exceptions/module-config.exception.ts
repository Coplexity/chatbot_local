import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Module Configuration Exception
 * Thrown when there is a misconfiguration in a module
 */
export class ModuleConfigException extends HttpException {
  constructor(message: string) {
    super(`Module Configuration Error: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
