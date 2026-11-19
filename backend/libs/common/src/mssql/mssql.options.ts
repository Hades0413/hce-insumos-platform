export interface MssqlModuleOptions {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  poolMax: number;
  poolMin: number;
  requestTimeoutMs: number;
  appName: string;
}
