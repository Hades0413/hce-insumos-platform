import { Provider } from '@nestjs/common';
import { Permiso } from '@hce/contracts';
import { AuthorizedUseCase, OPERATION_OBSERVER, ObservedUseCase, OperationObserver, UseCase } from '@hce/core';
import { PrometheusOperationObserver } from '../metrics/prometheus-operation.observer';

type Token = symbol | string | (abstract new (...args: never[]) => unknown);

export const operationObserverProvider: Provider = {
  provide: OPERATION_OBSERVER,
  useClass: PrometheusOperationObserver,
};

export function provideUseCase<D extends unknown[]>(
  token: symbol,
  name: string,
  factory: (...deps: D) => UseCase<unknown, unknown, never>,
  inject: Token[],
  permiso?: Permiso,
): Provider {
  return {
    provide: token,
    inject: [OPERATION_OBSERVER, ...inject],
    useFactory: (observer: OperationObserver, ...deps: D) => {
      const core = factory(...deps);
      if (!permiso) return new ObservedUseCase(name, core, observer);
      return new ObservedUseCase(name, new AuthorizedUseCase(core, permiso), observer);
    },
  };
}
