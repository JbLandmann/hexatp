import type { UtilisateurId } from '../domain/ids.js';
import { Decision, DecisionSwipe } from '../domain/decision.js';
import type { StatutInteraction } from '../domain/swipe.js';
import type { QuotaSwipe } from '../domain/quota-swipe.js';
import type { PolitiqueExposition } from '../domain/politique-exposition.js';
import type { InteractionRepository } from './ports/interaction-repository.js';
import type { CompteurSwipeRepository } from './ports/compteur-swipe-repository.js';
import type { AbonnementRepository } from './ports/abonnement-repository.js';
import type { EventBus } from '../infrastructure/event-bus.js';

/** Profil candidat renvoyé par la découverte. */
export interface Profil {
  utilisateurId: UtilisateurId;
  interactionEnAttente: boolean;
  derniereExposition: Date | null;
}

/**
 * Application Service : orchestre la découverte de profils et l'enregistrement
 * des décisions. Ne contient aucune règle métier « dure » : il délègue aux
 * policies du domaine et passe par les ports pour la persistance.
 */
export class ServiceDecouverte {
  constructor(
    private readonly interactions: InteractionRepository,
    private readonly compteurs: CompteurSwipeRepository,
    private readonly abonnements: AbonnementRepository,
    private readonly quota: QuotaSwipe,
    private readonly exposition: PolitiqueExposition,
    private readonly bus: EventBus,
  ) {}

  /**
   * Recherche des profils à proposer.
   * Processus (simplifié) :
   *  1. Part d'un ensemble de candidats fourni.
   *  2. Filtre ceux qui respectent la politique d'exposition.
   *  3. Priorise ceux ayant une interaction en attente.
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
   * Processus :
   *  1. Charge compteur + abonnement, vérifie le quota (policy domaine).
   *  2. Récupère/crée l'interaction via le port.
   *  3. Enregistre la décision sur l'agrégat (qui recalcule le statut).
   *  4. Incrémente le compteur puis persiste le tout via les ports.
   *  5. APRÈS persistance, publie les événements émis par l'agrégat sur le bus.
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

    // Publication APRÈS persistance : on ne notifie le reste du système que
    // lorsque l'état est durablement enregistré (jamais avant).
    for (const evenement of interaction.collecterEvenements()) {
      await this.bus.publier(evenement);
    }

    return interaction.getStatut();
  }
}
