import type { InteractionId, UtilisateurId } from '../ids.js';
import type { DomainEvent } from './domain-event.js';

/**
 * Domain Event : un match vient de se produire entre deux participants.
 * Nommé au passé (fait déjà survenu). Immuable, et au payload auto-suffisant :
 * un handler peut notifier les deux personnes sans rien aller rechercher.
 */
export class MatchProduit implements DomainEvent {
  readonly nom = 'MatchProduit';

  constructor(
    public readonly interactionId: InteractionId,
    public readonly participantAId: UtilisateurId,
    public readonly participantBId: UtilisateurId,
    public readonly dateSurvenue: Date,
  ) {
    // Processus : on fige l'objet pour garantir l'immuabilité de l'événement.
    Object.freeze(this);
  }
}
