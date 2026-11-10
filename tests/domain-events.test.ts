import { describe, it, expect, beforeEach } from 'vitest';
import { UtilisateurId, InteractionId } from '../src/domain/ids.js';
import { Decision, DecisionSwipe } from '../src/domain/decision.js';
import { Swipe, StatutInteraction } from '../src/domain/swipe.js';
import { MatchProduit } from '../src/domain/events/match-produit.js';
import { QuotaSwipe } from '../src/domain/quota-swipe.js';
import { PolitiqueExposition } from '../src/domain/politique-exposition.js';
import { ServiceDecouverte } from '../src/application/service-decouverte.js';
import { EventBus } from '../src/infrastructure/event-bus.js';
import { InMemoryInteractionRepository } from '../src/infrastructure/in-memory-interaction-repository.js';
import { InMemoryCompteurSwipeRepository } from '../src/infrastructure/in-memory-compteur-swipe-repository.js';
import { InMemoryAbonnementRepository } from '../src/infrastructure/in-memory-abonnement-repository.js';

function creerService() {
  const interactions = new InMemoryInteractionRepository();
  const compteurs = new InMemoryCompteurSwipeRepository();
  const abonnements = new InMemoryAbonnementRepository();
  const quota = new QuotaSwipe(100, 24 * 60 * 60 * 1000);
  const exposition = new PolitiqueExposition(60 * 60 * 1000);
  const bus = new EventBus();
  const service = new ServiceDecouverte(
    interactions,
    compteurs,
    abonnements,
    quota,
    exposition,
    bus,
  );
  return { service, bus };
}

describe('Swipe émet MatchProduit (aggregate)', () => {
  let alice: ReturnType<typeof UtilisateurId>;
  let bob: ReturnType<typeof UtilisateurId>;
  let swipe: Swipe;

  beforeEach(() => {
    alice = UtilisateurId('alice');
    bob = UtilisateurId('bob');
    swipe = new Swipe(InteractionId('i1'), alice, bob);
  });

  it('enregistre un MatchProduit lors de la bascule vers MATCHED', () => {
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date()));
    swipe.enregistrerDecision(new DecisionSwipe(bob, Decision.OUI, new Date()));

    const evenements = swipe.collecterEvenements();

    expect(evenements).toHaveLength(1);
    expect(evenements[0]).toBeInstanceOf(MatchProduit);
  });

  it('transporte un payload auto-suffisant (les deux participants)', () => {
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date()));
    swipe.enregistrerDecision(new DecisionSwipe(bob, Decision.OUI, new Date()));

    const [event] = swipe.collecterEvenements() as MatchProduit[];

    expect(event.participantAId).toBe(alice);
    expect(event.participantBId).toBe(bob);
  });

  it('n émet aucun événement quand il n y a pas de match', () => {
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.NON, new Date()));

    expect(swipe.collecterEvenements()).toHaveLength(0);
  });

  it('vide la liste après collecte (collect & clear, pas de doublon)', () => {
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date()));
    swipe.enregistrerDecision(new DecisionSwipe(bob, Decision.OUI, new Date()));

    swipe.collecterEvenements();

    expect(swipe.collecterEvenements()).toHaveLength(0);
  });
});

describe('ServiceDecouverte publie MatchProduit (orchestration)', () => {
  it('publie MatchProduit sur le bus quand un match se produit', async () => {
    const { service, bus } = creerService();
    const alice = UtilisateurId('alice');
    const bob = UtilisateurId('bob');
    const recus: MatchProduit[] = [];
    bus.souscrire<MatchProduit>('MatchProduit', (event) => {
      recus.push(event);
    });

    await service.enregistrerDecision(alice, bob, Decision.OUI);
    const statut = await service.enregistrerDecision(bob, alice, Decision.OUI);

    expect(statut).toBe(StatutInteraction.MATCHED);
    expect(recus).toHaveLength(1);
  });

  it('ne publie rien tant qu il n y a pas de match', async () => {
    const { service, bus } = creerService();
    const alice = UtilisateurId('alice');
    const bob = UtilisateurId('bob');
    const recus: MatchProduit[] = [];
    bus.souscrire<MatchProduit>('MatchProduit', (event) => {
      recus.push(event);
    });

    await service.enregistrerDecision(alice, bob, Decision.OUI);

    expect(recus).toHaveLength(0);
  });
});
