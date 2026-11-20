import { Injectable, Logger } from '@nestjs/common';
import { SecurityAudit } from '../../domain/security/security-audit.port';

@Injectable()
export class NestSecurityAudit implements SecurityAudit {
  private readonly logger = new Logger('SecurityAudit');

  alert(event: string, data: Record<string, unknown>): void {
    this.logger.warn({ securityEvent: event, ...data }, event);
  }

  info(event: string, data: Record<string, unknown>): void {
    this.logger.log({ securityEvent: event, ...data }, event);
  }
}
