import type { InteractionId, UtilisateurId } from '../ids.js';
import type { DomainEvent } from './domain-event.js';

export class MatchProduit implements DomainEvent {
  static readonly NOM = 'MatchProduit';

  readonly nom = MatchProduit.NOM;

  constructor(
    public readonly interactionId: InteractionId,
    public readonly participantAId: UtilisateurId,
    public readonly participantBId: UtilisateurId,
    public readonly dateSurvenue: Date,
  ) {
    Object.freeze(this);
  }
}
