import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
import { QueryFailedError } from "typeorm";

/**
 * Query Failed Error Filter
 * Catches TypeORM QueryFailedError and transforms it into user-friendly HTTP responses
 */
@Catch(QueryFailedError)
export class QueryFailedErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedErrorFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Log the error
    this.logger.error(
      `QueryFailedError: ${exception.message}`,
      exception.stack,
    );

    // Check if the error is related to invalid UUID syntax
    const isInvalidUUID
      = exception.message.includes("invalid input syntax for type uuid")
        || exception.message.includes("invalid input syntax for uuid");

    // Check for other common database validation errors
    const isValidationError
      = isInvalidUUID
        || exception.message.includes("violates foreign key constraint")
        || exception.message.includes("violates unique constraint")
        || exception.message.includes("violates check constraint")
        || exception.message.includes("violates not-null constraint")
        || exception.message.includes("invalid input syntax");

    const statusCode = isValidationError
      ? HttpStatus.BAD_REQUEST
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract a user-friendly error message
    let userMessage = "Database query failed";

    if (isInvalidUUID) {
      userMessage = "Invalid UUID format provided";
    }
    else if (exception.message.includes("violates foreign key constraint")) {
      userMessage = "Referenced resource does not exist";
    }
    else if (exception.message.includes("violates unique constraint")) {
      userMessage = "Resource already exists";
    }
    else if (exception.message.includes("violates not-null constraint")) {
      userMessage = "Required field is missing";
    }
    else if (exception.message.includes("invalid input syntax")) {
      userMessage = "Invalid input format";
    }

    response.status(statusCode).json({
      statusCode,
      message: userMessage,
      error: isValidationError ? "Bad Request" : "Internal Server Error",
      details:
        process.env.NODE_ENV !== "production" ? exception.message : undefined,
    });
  }
}
