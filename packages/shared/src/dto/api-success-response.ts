export type ApiSuccessResponse<T> = {
  success: true;
  requestId: string;
  timestamp: string;
  data: T;
};
