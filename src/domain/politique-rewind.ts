import type { Abonnement } from './abonnement.js';

export class PolitiqueRewind {
  peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean {
    return abonnement?.estActif(aLaDate) ?? false;
  }
}
