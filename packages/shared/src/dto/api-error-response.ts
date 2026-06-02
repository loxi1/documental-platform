import type { ApiErrorCode } from '../constants/error-codes.js';

export type ApiErrorResponse = {
  success: false;
  requestId: string;
  timestamp: string;
  path: string;
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
  };
};
