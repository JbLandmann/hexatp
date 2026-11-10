import type { InteractionRepository } from '../application/ports/interaction-repository.js';
import { InteractionId, type UtilisateurId } from '../domain/ids.js';
import { Swipe } from '../domain/swipe.js';

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caractere) => {
    const aleatoire = Math.floor(Math.random() * 16);
    return (caractere === 'x' ? aleatoire : (aleatoire & 0x3) | 0x8).toString(16);
  });
}

/**
 * Adaptateur (infrastructure) : stockage en mémoire des interactions.
 * Implémente le port InteractionRepository — remplaçable par une vraie DB.
 */
export class InMemoryInteractionRepository implements InteractionRepository {
  private readonly parCle = new Map<string, Swipe>();

  /** Clé stable indépendante de l'ordre des deux participants. */
  private cle(a: UtilisateurId, b: UtilisateurId): string {
    return [a, b].sort().join('::');
  }

  async trouverOuCreer(participantAId: UtilisateurId, participantBId: UtilisateurId): Promise<Swipe> {
    const cle = this.cle(participantAId, participantBId);
    let interaction = this.parCle.get(cle);
    if (!interaction) {
      interaction = new Swipe(InteractionId(randomUUID()), participantAId, participantBId);
      this.parCle.set(cle, interaction);
    }
    return interaction;
  }

  async trouverDerniereDecisionDe(utilisateurId: UtilisateurId): Promise<Swipe | null> {
    let derniereInteraction: Swipe | null = null;
    let dateDerniereDecision: Date | null = null;

    // Processus : compare la date des décisions exposées par chaque agrégat.
    for (const interaction of this.parCle.values()) {
      const decision = interaction.derniereDecisionDe(utilisateurId);
      if (decision && (!dateDerniereDecision || decision.dateDecision > dateDerniereDecision)) {
        derniereInteraction = interaction;
        dateDerniereDecision = decision.dateDecision;
      }
    }

    return derniereInteraction;
  }

  async sauvegarder(interaction: Swipe): Promise<void> {
    const cle = this.cle(interaction.participantAId, interaction.participantBId);
    this.parCle.set(cle, interaction);
  }
}
