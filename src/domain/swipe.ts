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
  private readonly evenements: DomainEvent[] = [];
  private statut: StatutInteraction = StatutInteraction.PENDING;

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
   * Annule la décision d'un participant.
   * Processus :
   *  1. Vérifie que l'émetteur appartient à l'interaction.
   *  2. Retire sa décision si elle existe.
   *  3. Recalcule le statut avec la règle métier existante.
   */
  annulerDecisionDe(emetteurId: UtilisateurId): void {
    const estParticipant =
      emetteurId === this.participantAId || emetteurId === this.participantBId;
    if (!estParticipant) {
      throw new Error('Émetteur hors de cette interaction');
    }

    const index = this.decisions.findIndex((decision) => decision.emetteurId === emetteurId);
    if (index === -1) {
      return;
    }

    this.decisions.splice(index, 1);
    this.determinerResultat();
  }

  /** Expose la décision datée sans rendre la collection interne publique. */
  derniereDecisionDe(emetteurId: UtilisateurId): DecisionSwipe | null {
    return (
      this.decisions.find((decision) => decision.emetteurId === emetteurId) ?? null
    );
  }

  /**
   * Détermine le résultat de l'interaction.
   * Processus :
   *  - Un seul OUI et pas encore de réponse adverse => reste PENDING.
   *  - Dès qu'un NON est présent => NO_MATCH.
   *  - Deux OUI (un de chaque participant) => MATCHED.
   */
  determinerResultat(): StatutInteraction {
    const ancienStatut = this.statut;
    const aUnNon = this.decisions.some((d) => d.decision === Decision.NON);
    if (aUnNon) {
      this.statut = StatutInteraction.NO_MATCH;
    } else {
      const ouiDistincts = new Set(
        this.decisions.filter((d) => d.decision === Decision.OUI).map((d) => d.emetteurId),
      );
      this.statut =
        ouiDistincts.size === 2 ? StatutInteraction.MATCHED : StatutInteraction.PENDING;
    }

    if (ancienStatut !== StatutInteraction.MATCHED && this.statut === StatutInteraction.MATCHED) {
      this.enregistrerEvenement(
        new MatchProduit(this.id, this.participantAId, this.participantBId),
      );
    }

    return this.statut;
  }

  /** Retourne les événements métier en attente puis vide la collection. */
  collecterEvenements(): DomainEvent[] {
    const evenements = [...this.evenements];
    this.evenements.length = 0;
    return evenements;
  }

  private enregistrerEvenement(evenement: DomainEvent): void {
    this.evenements.push(evenement);
  }

  getStatut(): StatutInteraction {
    return this.statut;
  }
}
