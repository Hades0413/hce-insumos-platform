import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

const DESCRIPTIONS: Record<number, string> = {
  400: 'VALIDATION_ERROR: datos inválidos (errors[] por campo)',
  404: 'NOT_FOUND',
  409: 'CONFLICT / DUPLICATE / CONCURRENCY_CONFLICT / HAS_MOVEMENTS',
  422: 'Regla de negocio (STOCK_INSUFICIENTE, IDEMPOTENCY_CONFLICT, BUSINESS_RULE)',
  429: 'RATE_LIMITED',
  503: 'UPSTREAM_UNAVAILABLE',
  504: 'UPSTREAM_TIMEOUT',
};

export function ApiProblemResponses(...statuses: number[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: DESCRIPTIONS[status] ?? 'Error',
        content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
      }),
    ),
  );
}
