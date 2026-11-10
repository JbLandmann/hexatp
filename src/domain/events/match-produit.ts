import type { DomainEvent } from './domain-event.js';
import type { InteractionId, UtilisateurId } from '../ids.js';

/** Événement métier émis lorsque les deux participants se sont mutuellement choisis. */
export class MatchProduit implements DomainEvent {
  readonly nom = 'MatchProduit';
  private readonly date: Date;

  constructor(
    public readonly interactionId: InteractionId,
    public readonly participantAId: UtilisateurId,
    public readonly participantBId: UtilisateurId,
    dateSurvenue: Date = new Date(),
  ) {
    this.date = new Date(dateSurvenue);
    Object.freeze(this);
  }

  get dateSurvenue(): Date {
    return new Date(this.date);
  }
}
