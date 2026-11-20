export const SECURITY_AUDIT = Symbol('SECURITY_AUDIT');

export interface SecurityAudit {
  alert(event: string, data: Record<string, unknown>): void;
  info(event: string, data: Record<string, unknown>): void;
}
