import type { Abonnement } from './abonnement.js';

/** Policy métier qui réserve le rewind aux abonnements premium actifs. */
export class PolitiqueRewind {
  /**
   * Indique si un utilisateur peut annuler une décision à la date donnée.
   * Processus :
   *  1. Refuse l'accès en l'absence d'abonnement.
   *  2. Délègue la vérification du statut et de la période à Abonnement.
   */
  peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean {
    return abonnement?.estActif(aLaDate) ?? false;
  }
}
