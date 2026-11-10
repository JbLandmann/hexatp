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
  /** Clés des interactions dans l'ordre de sauvegarde (la plus récente en dernier). */
  private readonly ordreSauvegarde: string[] = [];

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

  /**
   * Retrouve la dernière interaction décidée par l'utilisateur.
   * Processus : on parcourt les clés de la plus récemment sauvegardée à la plus
   * ancienne et on renvoie la première interaction où l'utilisateur a décidé.
   */
  async trouverDerniereDecisionDe(utilisateurId: UtilisateurId): Promise<Swipe | null> {
    for (let i = this.ordreSauvegarde.length - 1; i >= 0; i -= 1) {
      const interaction = this.parCle.get(this.ordreSauvegarde[i]);
      if (interaction?.aDecisionDe(utilisateurId)) {
        return interaction;
      }
    }
    return null;
  }

  async sauvegarder(interaction: Swipe): Promise<void> {
    const cle = this.cle(interaction.participantAId, interaction.participantBId);
    this.parCle.set(cle, interaction);

    const dejaVue = this.ordreSauvegarde.indexOf(cle);
    if (dejaVue !== -1) {
      this.ordreSauvegarde.splice(dejaVue, 1);
    }
    this.ordreSauvegarde.push(cle);
  }
}
