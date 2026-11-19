import { RequestContext } from '@hce/contracts';

/** Puerto de entrada (driving port): todo caso de uso expone la misma interfaz. */
export interface UseCase<I, O> {
  execute(input: I, ctx: RequestContext): Promise<O>;
}
