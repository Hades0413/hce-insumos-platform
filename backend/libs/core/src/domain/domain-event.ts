export interface DomainEvent<P extends object = object> {
  readonly type: string;
  readonly occurredAt: Date;
  readonly payload: P;
}

export abstract class AggregateRoot {
  private readonly pending: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.pending.push(event);
  }

  pullEvents(): DomainEvent[] {
    return this.pending.splice(0, this.pending.length);
  }
}
