export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} not found.`);
