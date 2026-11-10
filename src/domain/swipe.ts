import type { InteractionId, UtilisateurId } from './ids.js';
import { Decision, DecisionSwipe } from './decision.js';

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
   *  - Un seul OUI et pas encore de réponse adverse => reste PENDING.
   *  - Dès qu'un NON est présent => NO_MATCH.
   *  - Deux OUI (un de chaque participant) => MATCHED.
   */
  determinerResultat(): StatutInteraction {
    const aUnNon = this.decisions.some((d) => d.decision === Decision.NON);
    if (aUnNon) {
      this.statut = StatutInteraction.NO_MATCH;
      return this.statut;
    }

    const ouiDistincts = new Set(
      this.decisions.filter((d) => d.decision === Decision.OUI).map((d) => d.emetteurId),
    );
    this.statut = ouiDistincts.size === 2 ? StatutInteraction.MATCHED : StatutInteraction.PENDING;
    return this.statut;
  }

  getStatut(): StatutInteraction {
    return this.statut;
  }

  /** On trouve la dernière décision de l'utilisateur en prenant celle avec la date la plus récente
   * On la retire de la BDD mais on peut pas utiliser les repository donc je sais pas comment on fait
   * On retire la décision de l'utilisateur dans l'interaction à laquelle elle était associée grâce à son id
   */
  annulerDecisionDe(emetteurId: UtilisateurId): void{
    this.decisions.forEach((decision, index) => {
      if(decision.emetteurId === emetteurId){
        this.decisions.splice(index, 1);
        this.determinerResultat();
      }      
    });
  }
}
