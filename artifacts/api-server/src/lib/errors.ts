import { type Request, type Response, type NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(resource: string): AppError {
  return new AppError(404, "NOT_FOUND", `${resource} not found`);
}

export function badRequest(
  message: string,
  details?: Array<{ field: string; message: string }>
): AppError {
  return new AppError(400, "BAD_REQUEST", message, details);
}

export function conflict(message: string): AppError {
  return new AppError(409, "CONFLICT", message);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.error,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}
