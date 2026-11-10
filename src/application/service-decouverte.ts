import type { UtilisateurId } from '../domain/ids.js';
import { Decision, DecisionSwipe } from '../domain/decision.js';
import type { StatutInteraction } from '../domain/swipe.js';
import type { QuotaSwipe } from '../domain/quota-swipe.js';
import type { PolitiqueExposition } from '../domain/politique-exposition.js';
import type { PolitiqueRewind } from '../domain/politique-rewind.js';
import type { InteractionRepository } from './ports/interaction-repository.js';
import type { CompteurSwipeRepository } from './ports/compteur-swipe-repository.js';
import type { AbonnementRepository } from './ports/abonnement-repository.js';

/** Profil candidat renvoyé par la découverte. */
export interface Profil {
  utilisateurId: UtilisateurId;
  interactionEnAttente: boolean;
  derniereExposition: Date | null;
}

/**
 * Application Service : orchestre la découverte de profils et l'enregistrement
 * des décisions et des annulations (Rewind).
 */
export class ServiceDecouverte {
  constructor(
    private readonly interactions: InteractionRepository,
    private readonly compteurs: CompteurSwipeRepository,
    private readonly abonnements: AbonnementRepository,
    private readonly quota: QuotaSwipe,
    private readonly exposition: PolitiqueExposition,
    private readonly politiqueRewind: PolitiqueRewind,
  ) {}

  /**
   * Recherche des profils à proposer.
   */
  rechercherProfils(candidats: Profil[], maintenant: Date = new Date()): Profil[] {
    const filtres = this.filtrerProfils(candidats, maintenant);
    return this.prioriserInteractionsEnAttente(filtres);
  }

  /** Filtre : ne garde que les profils ré-exposables selon la policy. */
  filtrerProfils(candidats: Profil[], maintenant: Date = new Date()): Profil[] {
    return candidats.filter((p) =>
      this.exposition.verifierDelaiAvantNouvelleExposition(p.derniereExposition, maintenant),
    );
  }

  /** Priorisation : les interactions en attente passent devant. */
  prioriserInteractionsEnAttente(profils: Profil[]): Profil[] {
    return [...profils].sort(
      (a, b) => Number(b.interactionEnAttente) - Number(a.interactionEnAttente),
    );
  }

  /**
   * Enregistre la décision d'un émetteur sur une cible.
   */
  async enregistrerDecision(
    emetteurId: UtilisateurId,
    cibleId: UtilisateurId,
    decision: Decision,
    maintenant: Date = new Date(),
  ): Promise<StatutInteraction> {
    const compteur = await this.compteurs.obtenirPourUtilisateur(emetteurId);
    const abonnement = await this.abonnements.obtenirActif(emetteurId);

    if (!this.quota.verifierQuota(compteur, abonnement, maintenant)) {
      throw new Error('Quota de swipes atteint — abonnement requis');
    }

    const interaction = await this.interactions.trouverOuCreer(emetteurId, cibleId);
    interaction.enregistrerDecision(new DecisionSwipe(emetteurId, decision, maintenant));

    compteur.enregistrerDecision();

    await this.interactions.sauvegarder(interaction);
    await this.compteurs.sauvegarder(compteur);

    return interaction.getStatut();
  }

  /**
   * Annule la dernière décision prise par un utilisateur (fonctionnalité Rewind).
   * Processus :
   * 1. Charge l'abonnement via le port.
   * 2. Vérifie le droit via la policy métier (PolitiqueRewind).
   * 3. Récupère la dernière interaction concernée via le port.
   * 4. Appelle la méthode métier sur l'agrégat Swipe.
   * 5. Persiste l'état mis à jour via le port et renvoie le nouveau statut.
   */
  async annulerDerniereDecision(
    utilisateurId: UtilisateurId,
    maintenant: Date = new Date(),
  ): Promise<StatutInteraction> {
    const abonnement = await this.abonnements.obtenirActif(utilisateurId);

    if (!this.politiqueRewind.peutAnnuler(abonnement, maintenant)) {
      throw new Error("Action refusée : un abonnement premium actif est requis pour effectuer un Rewind.");
    }

    const interaction = await this.interactions.trouverDerniereDecisionDe(utilisateurId);
    if (!interaction) {
      throw new Error("Aucune décision récente à annuler trouvée.");
    }

    interaction.annulerDecisionDe(utilisateurId);

    await this.interactions.sauvegarder(interaction);

    return interaction.getStatut();
  }
}
