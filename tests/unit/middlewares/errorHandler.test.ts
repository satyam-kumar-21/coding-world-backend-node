import { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '../../../src/middlewares/errorHandler';

describe('AppError hierarchy', () => {
  it('AppError sets statusCode and message', () => {
    const err = new AppError('Test error', 422);
    expect(err.message).toBe('Test error');
    expect(err.statusCode).toBe(422);
    expect(err.isOperational).toBe(true);
  });

  it('NotFoundError defaults to 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
  });

  it('UnauthorizedError defaults to 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError defaults to 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it('ConflictError defaults to 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });

  it('AppError with errors array', () => {
    const errors = [{ field: 'email', message: 'Invalid' }];
    const err = new AppError('Validation failed', 422, errors);
    expect(err.errors).toEqual(errors);
  });
});
