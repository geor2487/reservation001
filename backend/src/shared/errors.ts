export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "DomainError";
  }

  static notFound(message: string): DomainError {
    return new DomainError(message, 404);
  }

  static unauthorized(message: string): DomainError {
    return new DomainError(message, 401);
  }

  static forbidden(message: string): DomainError {
    return new DomainError(message, 403);
  }

  static conflict(message: string): DomainError {
    return new DomainError(message, 409);
  }
}
