import { randomUUID } from 'node:crypto';
import { Swipe } from '../domain/swipe.js';
import { InteractionId, type UtilisateurId } from '../domain/ids.js';
import type { InteractionRepository } from '../application/ports/interaction-repository.js';

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

  async sauvegarder(interaction: Swipe): Promise<void> {
    const cle = this.cle(interaction.participantAId, interaction.participantBId);
    this.parCle.set(cle, interaction);
  }

  async trouverDerniereDecisionDe(utilisateurId: UtilisateurId): Promise<Swipe | null> {
    let derniere: Swipe | null = null;
    let dateDerniere: Date | null = null;

    for (const interaction of this.parCle.values()) {
      const date = interaction.dateDecisionDe(utilisateurId);
      if (date && (!dateDerniere || date >= dateDerniere)) {
        derniere = interaction;
        dateDerniere = date;
      }
    }
    return derniere;
  }
}
