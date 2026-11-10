import type { DomainEvent } from '../domain/events/domain-event.js';

/** Un handler réagit à un événement ; il peut être synchrone ou asynchrone. */
export type Handler<E extends DomainEvent> = (event: E) => void | Promise<void>;

/**
 * Bus publish/subscribe en mémoire (synchrone).
 * Détail technique remplaçable : il ne connaît que l'interface `DomainEvent`
 * du domaine → la dépendance va bien `infra → domaine`.
 * - souscrire : enregistre un handler pour un nom d'événement.
 * - publier   : appelle tous les handlers abonnés à ce nom.
 */
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
      await handler(event); // on attend chaque handler (simple et déterministe)
    }
  }
}
