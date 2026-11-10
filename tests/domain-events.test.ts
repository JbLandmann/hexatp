import { describe, it, expect } from 'vitest';
import { InteractionId, UtilisateurId } from '../src/domain/ids.js';
import { Decision, DecisionSwipe } from '../src/domain/decision.js';
import { Swipe } from '../src/domain/swipe.js';
import { MatchProduit } from '../src/domain/events/match-produit.js';
import type { DomainEvent } from '../src/domain/events/domain-event.js';
import { abonnement, creerContexte } from './fixtures.js';

const alice = UtilisateurId('alice');
const bob = UtilisateurId('bob');

function matcher(swipe: Swipe, date = new Date()): void {
  swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, date));
  swipe.enregistrerDecision(new DecisionSwipe(bob, Decision.OUI, date));
}

describe('MatchProduit', () => {
  it('est immuable', () => {
    const event = new MatchProduit(InteractionId('i1'), alice, bob, new Date());

    expect(Object.isFrozen(event)).toBe(true);
    expect(event.nom).toBe('MatchProduit');
  });
});

describe('Swipe et ses événements', () => {
  it('émet MatchProduit au moment du match', () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    const date = new Date('2026-01-01T10:00:00Z');
    matcher(swipe, date);

    const [event, ...reste] = swipe.collecterEvenements();

    expect(reste).toHaveLength(0);
    expect(event).toBeInstanceOf(MatchProduit);
    expect(event).toMatchObject({
      interactionId: 'i1',
      participantAId: alice,
      participantBId: bob,
      dateSurvenue: date,
    });
  });

  it("n'émet rien tant qu'il n'y a pas de match", () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date()));
    swipe.enregistrerDecision(new DecisionSwipe(bob, Decision.NON, new Date()));

    expect(swipe.collecterEvenements()).toEqual([]);
  });

  it('vide la liste après collecte', () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    matcher(swipe);

    swipe.collecterEvenements();

    expect(swipe.collecterEvenements()).toEqual([]);
  });

  it("n'émet pas deux fois si on recalcule un statut déjà MATCHED", () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    matcher(swipe);

    swipe.determinerResultat();

    expect(swipe.collecterEvenements()).toHaveLength(1);
  });
});

describe('ServiceDecouverte et le bus', () => {
  it('publie MatchProduit une seule fois quand le match se fait', async () => {
    const { service, bus } = creerContexte();
    const recus: MatchProduit[] = [];
    bus.souscrire<MatchProduit>(MatchProduit.NOM, (event) => {
      recus.push(event);
    });

    await service.enregistrerDecision(alice, bob, Decision.OUI);
    expect(recus).toHaveLength(0);

    await service.enregistrerDecision(bob, alice, Decision.OUI);
    expect(recus).toHaveLength(1);
    expect([recus[0].participantAId, recus[0].participantBId].sort()).toEqual([alice, bob]);
  });

  it('publie après la sauvegarde', async () => {
    const { service, interactions, bus } = creerContexte();
    const appels: string[] = [];

    const sauvegarder = interactions.sauvegarder.bind(interactions);
    interactions.sauvegarder = async (interaction) => {
      appels.push('sauvegarder');
      await sauvegarder(interaction);
    };
    bus.souscrire(MatchProduit.NOM, () => {
      appels.push('publier');
    });

    await service.enregistrerDecision(alice, bob, Decision.OUI);
    await service.enregistrerDecision(bob, alice, Decision.OUI);

    expect(appels).toEqual(['sauvegarder', 'sauvegarder', 'publier']);
  });

  it('ne publie pas si la sauvegarde échoue', async () => {
    const { service, interactions, bus } = creerContexte();
    const recus: DomainEvent[] = [];
    bus.souscrire(MatchProduit.NOM, (event) => {
      recus.push(event);
    });

    await service.enregistrerDecision(alice, bob, Decision.OUI);
    interactions.sauvegarder = async () => {
      throw new Error('base indisponible');
    };

    await expect(service.enregistrerDecision(bob, alice, Decision.OUI)).rejects.toThrow();
    expect(recus).toHaveLength(0);
  });

  it('republie un match refait après un rewind', async () => {
    const { service, abonnements, bus } = creerContexte();
    abonnements.seed(abonnement(bob));
    let nbMatchs = 0;
    bus.souscrire(MatchProduit.NOM, () => {
      nbMatchs += 1;
    });

    await service.enregistrerDecision(alice, bob, Decision.OUI);
    await service.enregistrerDecision(bob, alice, Decision.OUI);
    await service.annulerDerniereDecision(bob);
    await service.enregistrerDecision(bob, alice, Decision.OUI);

    expect(nbMatchs).toBe(2);
  });
});
