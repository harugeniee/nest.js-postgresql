export interface DomainEventPayload<T> {
  before?: Partial<T> | null;
  after?: Partial<T> | null;
  actor?: { id?: string; [k: string]: unknown } | null;
}

export type DomainEventName =
  | `${string}.created`
  | `${string}.updated`
  | `${string}.deleted`
  | `${string}.restored`;
