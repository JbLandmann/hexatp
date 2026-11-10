import type { Abonnement } from './abonnement.js';

/**
 * Domain Policy : l'annulation est réservée aux abonnements premium actifs.
 */
export class PolitiqueRewind {
  /**
   * Vérifie le droit d'annuler à la date fournie.
   * Processus :
   *  1. Refuse l'absence d'abonnement.
   *  2. Délègue la vérification de période et de statut à l'abonnement.
   */
  peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean {
    return abonnement?.estActif(aLaDate) ?? false;
  }
}
