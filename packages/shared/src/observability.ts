export interface LiveResponse {
  service: string;
  status: 'ok';
  uptime: number;
}

export interface VersionResponse {
  service: string;
  version: string;
  node_env: string;
  uptime: number;
  commit: string;
  build_date: string;
}

export function createLiveResponse(service: string): LiveResponse {
  return {
    service,
    status: 'ok',
    uptime: process.uptime(),
  };
}

export function createVersionResponse(service: string): VersionResponse {
  return {
    service,
    version: process.env.APP_VERSION ?? 'unknown',
    node_env: process.env.NODE_ENV ?? 'unknown',
    uptime: process.uptime(),
    commit:
      process.env.GIT_COMMIT ??
      process.env.COMMIT_SHA ??
      process.env.SOURCE_VERSION ??
      'unknown',
    build_date:
      process.env.BUILD_DATE ??
      process.env.BUILD_TIME ??
      'unknown',
  };
}