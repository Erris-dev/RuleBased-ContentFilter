/**
 * Thrown by services and controllers for *expected* failure cases. Anything else
 * reaching the error middleware is treated as a bug and reported as a 500, so
 * throwing ApiError is how code opts into a specific status.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static notFound(what: string): ApiError {
    return new ApiError(404, `${what} not found`);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }
}

/** The single error response shape for the whole API. */
export interface ErrorBody {
  error: string;
  /** Field-level messages for validation failures: `{ keyword: "Required" }`. */
  details?: unknown;
}
