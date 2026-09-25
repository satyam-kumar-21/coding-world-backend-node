import { sendSuccess, sendCreated, sendError, sendNotFound, sendUnauthorized, sendBadRequest } from '../../../src/utils/response';

// Mock Express response
function mockRes() {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as unknown as import('express').Response;
}

describe('Response Utils', () => {
  it('sendSuccess returns 200 with success:true', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 }, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'OK', data: { id: 1 } }));
  });

  it('sendCreated returns 201', () => {
    const res = mockRes();
    sendCreated(res, { id: 2 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('sendError returns correct status with success:false', () => {
    const res = mockRes();
    sendError(res, 'Something broke', 500);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Something broke' }));
  });

  it('sendNotFound returns 404', () => {
    const res = mockRes();
    sendNotFound(res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sendUnauthorized returns 401', () => {
    const res = mockRes();
    sendUnauthorized(res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('sendBadRequest returns 400 with errors array', () => {
    const res = mockRes();
    sendBadRequest(res, 'Validation failed', [{ field: 'email', message: 'Invalid' }]);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: [{ field: 'email', message: 'Invalid' }] }));
  });
});
