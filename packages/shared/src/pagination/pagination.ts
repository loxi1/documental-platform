export type PaginationParams = {
  limit: number;
  offset: number;
};

export type PaginatedResponse<T> = {
  total: number;
  limit: number;
  offset: number;
  data: T[];
};

export function buildPagination(params: {
  limit?: number;
  offset?: number;
}): PaginationParams {
  return {
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  };
}
