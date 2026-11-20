import { Logger } from '@nestjs/common';

export function installProcessGuards(service: string, shutdown: () => Promise<void>): void {
  const logger = new Logger(`Process:${service}`);
  let exiting = false;
  const fatal = (kind: string) => (reason: unknown) => {
    logger.fatal(
      { kind, err: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason },
      'Error no controlado',
    );
    if (exiting) return;
    exiting = true;
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    shutdown()
      .catch(() => undefined)
      .finally(() => process.exit(1));
  };
  process.on('unhandledRejection', fatal('unhandledRejection'));
  process.on('uncaughtException', fatal('uncaughtException'));
}
