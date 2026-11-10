import type { MatchProduit } from '../domain/events/match-produit.js';

export class NotificationHandler {
  handle(event: MatchProduit): void {
    console.log(
      `Nouveau match entre ${event.participantAId} et ${event.participantBId} (interaction ${event.interactionId})`,
    );
  }
}
