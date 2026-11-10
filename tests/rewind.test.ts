import { describe, it, expect, beforeEach } from 'vitest';
import { UtilisateurId, InteractionId, AbonnementId } from '../src/domain/ids.js';
import { Decision, DecisionSwipe } from '../src/domain/decision.js';
import { Swipe, StatutInteraction } from '../src/domain/swipe.js';
import { Abonnement, StatutAbonnement } from '../src/domain/abonnement.js';
import { PolitiqueRewind } from '../src/domain/politique-rewind.js';
import { QuotaSwipe } from '../src/domain/quota-swipe.js';
import { PolitiqueExposition } from '../src/domain/politique-exposition.js';
import { ServiceDecouverte } from '../src/application/service-decouverte.js';
import { InMemoryInteractionRepository } from '../src/infrastructure/in-memory-interaction-repository.js';
import { InMemoryCompteurSwipeRepository } from '../src/infrastructure/in-memory-compteur-swipe-repository.js';
import { InMemoryAbonnementRepository } from '../src/infrastructure/in-memory-abonnement-repository.js';

function abonnementActif(utilisateurId: ReturnType<typeof UtilisateurId>): Abonnement {
  return new Abonnement(
    AbonnementId('ab1'),
    utilisateurId,
    new Date(Date.now() - 1000),
    new Date(Date.now() + 1_000_000),
    StatutAbonnement.ACTIF,
  );
}

function creerService() {
  const interactions = new InMemoryInteractionRepository();
  const compteurs = new InMemoryCompteurSwipeRepository();
  const abonnements = new InMemoryAbonnementRepository();
  const quota = new QuotaSwipe(100, 24 * 60 * 60 * 1000);
  const exposition = new PolitiqueExposition(60 * 60 * 1000);
  const rewind = new PolitiqueRewind();
  const service = new ServiceDecouverte(
    interactions,
    compteurs,
    abonnements,
    quota,
    exposition,
    rewind,
  );
  return { service, interactions, abonnements };
}

describe('PolitiqueRewind.peutAnnuler (pure)', () => {
  it('refuse quand il n y a aucun abonnement', () => {
    const rewind = new PolitiqueRewind();

    const autorise = rewind.peutAnnuler(null, new Date());

    expect(autorise).toBe(false);
  });

  it('autorise un abonne premium actif', () => {
    const rewind = new PolitiqueRewind();
    const alice = UtilisateurId('alice');

    const autorise = rewind.peutAnnuler(abonnementActif(alice), new Date());

    expect(autorise).toBe(true);
  });

  it('refuse un abonnement expire a la date donnee', () => {
    const rewind = new PolitiqueRewind();
    const alice = UtilisateurId('alice');
    const expire = new Abonnement(
      AbonnementId('ab1'),
      alice,
      new Date('2020-01-01'),
      new Date('2020-02-01'),
      StatutAbonnement.ACTIF,
    );

    const autorise = rewind.peutAnnuler(expire, new Date());

    expect(autorise).toBe(false);
  });
});

describe('Swipe.annulerDecisionDe (aggregate)', () => {
  let alice: ReturnType<typeof UtilisateurId>;
  let bob: ReturnType<typeof UtilisateurId>;
  let swipe: Swipe;

  beforeEach(() => {
    alice = UtilisateurId('alice');
    bob = UtilisateurId('bob');
    swipe = new Swipe(InteractionId('i1'), alice, bob);
  });

  it('revient a PENDING apres annulation d un match', () => {
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date()));
    swipe.enregistrerDecision(new DecisionSwipe(bob, Decision.OUI, new Date()));

    swipe.annulerDecisionDe(bob);

    expect(swipe.getStatut()).toBe(StatutInteraction.PENDING);
  });

  it('est idempotent si l emetteur n a aucune decision', () => {
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date()));

    swipe.annulerDecisionDe(bob);

    expect(swipe.getStatut()).toBe(StatutInteraction.PENDING);
  });
});

describe('ServiceDecouverte.annulerDerniereDecision (orchestration)', () => {
  it('annule la derniere decision d un abonne premium et renvoie le statut recalcule', async () => {
    const { service, abonnements } = creerService();
    const alice = UtilisateurId('alice');
    const bob = UtilisateurId('bob');
    abonnements.seed(abonnementActif(alice));

    await service.enregistrerDecision(alice, bob, Decision.OUI);
    await service.enregistrerDecision(bob, alice, Decision.OUI);

    const statut = await service.annulerDerniereDecision(alice);

    expect(statut).toBe(StatutInteraction.PENDING);
  });

  it('refuse le rewind a un utilisateur sans abonnement actif', async () => {
    const { service } = creerService();
    const alice = UtilisateurId('alice');
    const bob = UtilisateurId('bob');

    await service.enregistrerDecision(alice, bob, Decision.OUI);

    await expect(service.annulerDerniereDecision(alice)).rejects.toThrow(/premium/i);
  });

  it('echoue quand il n y a aucune decision a annuler', async () => {
    const { service, abonnements } = creerService();
    const alice = UtilisateurId('alice');
    abonnements.seed(abonnementActif(alice));

    await expect(service.annulerDerniereDecision(alice)).rejects.toThrow(/aucune/i);
  });
});
