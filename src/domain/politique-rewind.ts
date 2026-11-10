import {StatutAbonnement, Abonnement} from "./abonnement.js"

export class PolitiqueRewind{
    peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean{
        if(abonnement && abonnement.statut === StatutAbonnement.ACTIF){
            return true;
        } else {
            return false;
        }
    }
}