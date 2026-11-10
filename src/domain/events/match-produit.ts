import type { DomainEvent } from './domain-event.ts';
import type { InteractionId, UtilisateurId } from '../ids.js';

export class MatchProduit implements DomainEvent {
  readonly nom = 'MatchProduit';

  constructor(
    public readonly interactionId: InteractionId,
    public readonly participantAId: UtilisateurId,
    public readonly participantBId: UtilisateurId,
    public readonly dateSurvenue: Date = new Date(),
  ) {}
}