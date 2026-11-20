import { BadRequestException, ParseIntPipe, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppError } from '@hce/core';
import { ErrorDetail } from '@hce/contracts';

function flatten(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((e) => {
    const field = parent
      ? /^\d+$/.test(e.property)
        ? `${parent}[${e.property}]`
        : `${parent}.${e.property}`
      : e.property;
    const own = Object.values(e.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    validationError: { target: false, value: false },
    exceptionFactory: (errors) => AppError.validation('La solicitud contiene datos inválidos.', flatten(errors)),
  });
}

export class IdParamPipe extends ParseIntPipe {
  constructor() {
    super({ exceptionFactory: () => new BadRequestException('El identificador debe ser un entero positivo.') });
  }

  override async transform(value: string, metadata: Parameters<ParseIntPipe['transform']>[1]): Promise<number> {
    const n = await super.transform(value, metadata);
    if (n < 1 || n > 2_147_483_647) throw new BadRequestException('El identificador debe ser un entero positivo.');
    return n;
  }
}
