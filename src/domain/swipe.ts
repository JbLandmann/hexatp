import type { InteractionId, UtilisateurId } from './ids.js';
import { Decision, DecisionSwipe } from './decision.js';
import type { DomainEvent } from './events/domain-event.js';
import { MatchProduit } from './events/match-produit.js';

/** Statut d'une interaction entre deux participants. */
export enum StatutInteraction {
  PENDING = 'PENDING',
  NO_MATCH = 'NO_MATCH',
  MATCHED = 'MATCHED',
}

/**
 * Aggregate Root : l'interaction (swipe) entre deux participants.
 * Porte 1 à 2 décisions et calcule le résultat (match ou non).
 */
export class Swipe {
  private readonly decisions: DecisionSwipe[] = [];
  private statut: StatutInteraction = StatutInteraction.PENDING;
  private readonly evenements: DomainEvent[] = []; // Stockage temporaire des événements métier

  constructor(
    public readonly id: InteractionId,
    public readonly participantAId: UtilisateurId,
    public readonly participantBId: UtilisateurId,
  ) {}

  /**
   * Enregistre la décision d'un participant.
   * Processus :
   *  1. Vérifie que l'émetteur fait bien partie de l'interaction.
   *  2. Refuse une seconde décision du même émetteur (idempotence métier).
   *  3. Ajoute la décision puis recalcule le statut.
   */
  enregistrerDecision(decision: DecisionSwipe): void {
    const estParticipant =
      decision.emetteurId === this.participantAId || decision.emetteurId === this.participantBId;
    if (!estParticipant) {
      throw new Error('Émetteur hors de cette interaction');
    }
    if (this.decisions.some((d) => d.emetteurId === decision.emetteurId)) {
      throw new Error('Décision déjà enregistrée pour cet émetteur');
    }

    this.decisions.push(decision);
    this.determinerResultat();
  }

  /**
   * Retire la décision d'un émetteur spécifique et recalcule l'état de l'interaction.
   */
  annulerDecisionDe(emetteurId: UtilisateurId): void {
    const index = this.decisions.findIndex((d) => d.emetteurId === emetteurId);
    if (index === -1) {
      return; 
    }

    // Modification de l'état interne de l'agrégat
    this.decisions.splice(index, 1);
    
    // Recalcul du statut (revient à PENDING si plus de décisions)
    this.determinerResultat();
  }

  /**
   * Détermine le résultat de l'interaction.
   * Processus :
   *  - Un seul OUI et pas encore de réponse adverse => reste PENDING.
   *  - Dès qu'un NON est présent => NO_MATCH.
   *  - Deux OUI (un de chaque participant) => MATCHED.
   * Déclenche également un Domain Event si l'on bascule vers MATCHED.
   */
  determinerResultat(): StatutInteraction {
    const ancienStatut = this.statut;

    const aUnNon = this.decisions.some((d) => d.decision === Decision.NON);
    if (aUnNon) {
      this.statut = StatutInteraction.NO_MATCH;
      return this.statut;
    }

    const ouiDistincts = new Set(
      this.decisions.filter((d) => d.decision === Decision.OUI).map((d) => d.emetteurId),
    );
    this.statut = ouiDistincts.size === 2 ? StatutInteraction.MATCHED : StatutInteraction.PENDING;

    // Si on vient de basculer vers MATCHED, on enregistre l'événement métier
    if (ancienStatut !== StatutInteraction.MATCHED && this.statut === StatutInteraction.MATCHED) {
      this.evenements.push(
        new MatchProduit(this.id, this.participantAId, this.participantBId, new Date()),
      );
    }

    return this.statut;
  }

  /**
   * Récupère les événements produits par l'agrégat et vide la liste (pattern collect & clear).
   */
  collecterEvenements(): DomainEvent[] {
    const evts = [...this.evenements];
    this.evenements.length = 0;
    return evts;
  }

  getStatut(): StatutInteraction {
    return this.statut;
  }
}