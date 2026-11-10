import type { DomainEvent } from '../../domain/events/domain-event.js';

export interface PublicateurEvenements {
  publier(evenement: DomainEvent): Promise<void>;
}
