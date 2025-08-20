import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as messages from '../../responses/messages.json';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    // Get exception response
    const exceptionResponse = exception.getResponse();
    let messageKey = 'ERROR.INTERNAL';
    let errorMessage = exception.message;

    // Map HTTP status codes to message keys
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        messageKey = 'ERROR.VALIDATION';
        break;
      case HttpStatus.UNAUTHORIZED:
        messageKey = 'ERROR.UNAUTHORIZED';
        break;
      case HttpStatus.FORBIDDEN:
        messageKey = 'ERROR.FORBIDDEN';
        break;
      case HttpStatus.NOT_FOUND:
        messageKey = 'ERROR.NOT_FOUND';
        break;
      default:
        messageKey = 'ERROR.INTERNAL';
    }

    // If exception response has a custom messageKey, use it
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse['messageKey']
    ) {
      messageKey = exceptionResponse['messageKey'];
    }

    // Get message from messages.json
    const messageObj = messages[messageKey] || {
      es: 'Error interno del servidor',
      en: 'Internal server error',
    };

    // Handle validation errors
    let errorDetails = null;
    if (typeof exceptionResponse === 'object' && exceptionResponse['message']) {
      if (Array.isArray(exceptionResponse['message'])) {
        errorDetails = exceptionResponse['message'];
      } else {
        errorMessage = exceptionResponse['message'];
      }
    }

    response.status(status).json({
      statusCode: status,
      status: 'error',
      message: messageObj,
      data: {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
