import type { DomainEvent } from '../domain/events/domain-event.js';

export type Handler<E extends DomainEvent> = (event: E) => void | Promise<void>;

/** Bus publish/subscribe en mémoire. */
export class EventBus {
  private readonly handlers = new Map<string, Handler<DomainEvent>[]>();

  souscrire<E extends DomainEvent>(nomEvent: string, handler: Handler<E>): void {
    const liste = this.handlers.get(nomEvent) ?? [];
    liste.push(handler as Handler<DomainEvent>);
    this.handlers.set(nomEvent, liste);
  }

  async publier(event: DomainEvent): Promise<void> {
    const liste = this.handlers.get(event.nom) ?? [];
    for (const handler of liste) {
      await handler(event);
    }
  }
}
