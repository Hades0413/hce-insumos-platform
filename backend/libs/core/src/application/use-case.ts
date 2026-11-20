import { RequestContext, TraceContext } from '@hce/contracts';

export interface UseCase<I, O, C extends TraceContext = RequestContext> {
  execute(input: I, ctx: C): Promise<O>;
}
