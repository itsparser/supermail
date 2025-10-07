/**
 * Custom error classes for SuperMail
 */

export enum ErrorCode {
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // API errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  INVALID_EMAIL_ID = 'INVALID_EMAIL_ID',

  // Operation errors
  SEND_FAILED = 'SEND_FAILED',
  OPERATION_FAILED = 'OPERATION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class SuperMailError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public provider?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'SuperMailError';
    Object.setPrototypeOf(this, SuperMailError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      provider: this.provider,
      originalError: this.originalError?.message || this.originalError,
    };
  }
}

export class AuthenticationError extends SuperMailError {
  constructor(message: string, provider?: string, originalError?: any) {
    super(ErrorCode.AUTH_FAILED, message, provider, originalError);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends SuperMailError {
  constructor(
    message: string,
    provider?: string,
    public retryAfter?: number,
    originalError?: any
  ) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, provider, originalError);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends SuperMailError {
  constructor(
    message: string,
    provider?: string,
    public resourceId?: string,
    originalError?: any
  ) {
    super(ErrorCode.NOT_FOUND, message, provider, originalError);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends SuperMailError {
  constructor(
    message: string,
    public field?: string,
    originalError?: any
  ) {
    super(ErrorCode.INVALID_INPUT, message, undefined, originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Helper function to normalize provider-specific errors
 */
export function normalizeError(error: any, provider: string): SuperMailError {
  // Gmail errors (Google API)
  if (provider === 'gmail') {
    const statusCode = error.code || error.response?.status;

    if (statusCode === 401) {
      return new AuthenticationError(
        'Gmail authentication failed. Token may be expired or invalid.',
        provider,
        error
      );
    }

    if (statusCode === 403) {
      return new SuperMailError(
        ErrorCode.QUOTA_EXCEEDED,
        'Gmail quota exceeded or insufficient permissions.',
        provider,
        error
      );
    }

    if (statusCode === 404) {
      return new NotFoundError(
        'Email not found in Gmail.',
        provider,
        undefined,
        error
      );
    }

    if (statusCode === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      return new RateLimitError(
        'Gmail rate limit exceeded.',
        provider,
        retryAfter ? parseInt(retryAfter) : undefined,
        error
      );
    }
  }

  // Microsoft Graph errors
  if (provider === 'microsoft') {
    const statusCode = error.statusCode || error.code;
    const errorCode = error.code || error.body?.error?.code;

    if (statusCode === 401 || errorCode === 'InvalidAuthenticationToken') {
      return new AuthenticationError(
        'Microsoft authentication failed. Token may be expired or invalid.',
        provider,
        error
      );
    }

    if (statusCode === 403 || errorCode === 'Forbidden') {
      return new SuperMailError(
        ErrorCode.QUOTA_EXCEEDED,
        'Microsoft insufficient permissions or quota exceeded.',
        provider,
        error
      );
    }

    if (statusCode === 404 || errorCode === 'ResourceNotFound') {
      return new NotFoundError(
        'Email not found in Microsoft.',
        provider,
        undefined,
        error
      );
    }

    if (statusCode === 429 || errorCode === 'TooManyRequests') {
      const retryAfter = error.headers?.['retry-after'];
      return new RateLimitError(
        'Microsoft rate limit exceeded.',
        provider,
        retryAfter ? parseInt(retryAfter) : undefined,
        error
      );
    }
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new SuperMailError(
      ErrorCode.NETWORK_ERROR,
      `Network error: ${error.message}`,
      provider,
      error
    );
  }

  // Default unknown error
  return new SuperMailError(
    ErrorCode.UNKNOWN_ERROR,
    error.message || 'An unknown error occurred',
    provider,
    error
  );
}
