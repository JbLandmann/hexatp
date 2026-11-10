import type { Abonnement } from './abonnement.js';

/**
 * Domain Policy : le rewind (annuler sa dernière décision) est réservé aux
 * abonnés premium actifs.
 */
export class PolitiqueRewind {
  /**
   * Décide si l'utilisateur a le droit d'annuler sa dernière décision.
   * Processus : fonction PURE — l'abonnement est déjà chargé par le service
   * et passé en paramètre ; la policy vérifie seulement qu'il est actif à la
   * date donnée. Aucune dépendance infrastructure, donc testable sans base.
   */
  peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean {
    return abonnement?.estActif(aLaDate) ?? false;
  }
}
