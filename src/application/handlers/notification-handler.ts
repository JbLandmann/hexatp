import type { MatchProduit } from '../../domain/events/match-produit.js';

/** Réagit à la création d'un match pour notifier ses deux participants. */
export class NotificationHandler {
  handle(event: MatchProduit): void {
    console.log(
      `Match entre ${event.participantAId} et ${event.participantBId} (${event.interactionId})`,
    );
  }
}
