import type { Abonnement } from './abonnement.js';

/**
 * Domain Policy : encapsule la règle métier régissant le droit d'effectuer un Rewind.
 */
export class PolitiqueRewind {
  /**
   * Détermine si l'utilisateur a le droit d'annuler sa dernière décision.
   * Règle : l'utilisateur doit posséder un abonnement actif à la date donnée.
   */
  peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean {
    if (abonnement === null) {
      return false;
    }
    return abonnement.estActif(aLaDate);
  }
}