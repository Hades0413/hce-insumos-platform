'use client';

import { ApiError, describeApiError } from '@hce/api-client';
import { ApiErrorAlert } from '@hce/ui';

export function ApiErrorNotice({ error, title }: { error: unknown; title: string }) {
  if (!error) return null;
  const { message, details, reference } = describeApiError(ApiError.from(error));
  return <ApiErrorAlert title={title} message={message} details={details} reference={reference} />;
}

export function errorMessage(error: unknown): string {
  return describeApiError(ApiError.from(error)).message;
}
