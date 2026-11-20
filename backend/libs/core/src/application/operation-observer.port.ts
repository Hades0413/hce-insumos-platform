export type OperationOutcome =
  | { readonly kind: 'success' }
  | { readonly kind: 'business'; readonly code: string }
  | { readonly kind: 'error'; readonly error: unknown };

export interface OperationObserver {
  start(operation: string, ctx: { requestId: string; userId: string }): (outcome: OperationOutcome) => void;
}

export const OPERATION_OBSERVER = Symbol('OPERATION_OBSERVER');
