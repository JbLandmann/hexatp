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
  /** Événements métier survenus sur cet agrégat, en attente de publication. */
  private readonly evenements: DomainEvent[] = [];

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
   * Détermine le résultat de l'interaction.
   * Processus :
   *  1. Mémorise le statut AVANT recalcul (pour détecter une bascule).
   *  2. Un NON présent => NO_MATCH ; deux OUI distincts => MATCHED ; sinon PENDING.
   *  3. Si on BASCULE vers MATCHED (et qu'on n'y était pas déjà), on émet
   *     l'événement MatchProduit. La condition sur l'ancien statut évite les
   *     émissions en double si la méthode est rappelée.
   */
  determinerResultat(): StatutInteraction {
    const statutAvant = this.statut;

    const aUnNon = this.decisions.some((d) => d.decision === Decision.NON);
    if (aUnNon) {
      this.statut = StatutInteraction.NO_MATCH;
    } else {
      const ouiDistincts = new Set(
        this.decisions.filter((d) => d.decision === Decision.OUI).map((d) => d.emetteurId),
      );
      this.statut = ouiDistincts.size === 2 ? StatutInteraction.MATCHED : StatutInteraction.PENDING;
    }

    const basculeVersMatch =
      statutAvant !== StatutInteraction.MATCHED && this.statut === StatutInteraction.MATCHED;
    if (basculeVersMatch) {
      this.enregistrerEvenement(
        new MatchProduit(this.id, this.participantAId, this.participantBId, new Date()),
      );
    }

    return this.statut;
  }

  /** Mémorise un événement métier survenu (émis par le domaine). */
  private enregistrerEvenement(evenement: DomainEvent): void {
    this.evenements.push(evenement);
  }

  /**
   * Retourne les événements accumulés PUIS vide la liste (pattern collect & clear).
   * Vider la liste évite de publier deux fois le même événement.
   */
  collecterEvenements(): DomainEvent[] {
    const evenements = [...this.evenements];
    this.evenements.length = 0;
    return evenements;
  }

  getStatut(): StatutInteraction {
    return this.statut;
  }
}
