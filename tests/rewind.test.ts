import { describe, it, expect } from 'vitest';
import { InteractionId, UtilisateurId } from '../src/domain/ids.js';
import { Decision, DecisionSwipe } from '../src/domain/decision.js';
import { StatutAbonnement } from '../src/domain/abonnement.js';
import { Swipe, StatutInteraction } from '../src/domain/swipe.js';
import { PolitiqueRewind } from '../src/domain/politique-rewind.js';
import { abonnement, creerContexte } from './fixtures.js';

const alice = UtilisateurId('alice');
const bob = UtilisateurId('bob');
const charlie = UtilisateurId('charlie');

describe('Swipe.annulerDecisionDe', () => {
  it('retire la décision et repasse en PENDING', () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.NON, new Date()));

    swipe.annulerDecisionDe(alice);

    expect(swipe.getStatut()).toBe(StatutInteraction.PENDING);
    expect(swipe.dateDecisionDe(alice)).toBeNull();
  });

  it('défait un match si un des deux annule', () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date()));
    swipe.enregistrerDecision(new DecisionSwipe(bob, Decision.OUI, new Date()));

    swipe.annulerDecisionDe(bob);

    expect(swipe.getStatut()).toBe(StatutInteraction.PENDING);
  });

  it('permet de redécider après une annulation', () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.NON, new Date()));
    swipe.annulerDecisionDe(alice);

    expect(() =>
      swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.OUI, new Date())),
    ).not.toThrow();
  });

  it("ne fait rien si l'émetteur n'a pas décidé", () => {
    const swipe = new Swipe(InteractionId('i1'), alice, bob);
    swipe.enregistrerDecision(new DecisionSwipe(alice, Decision.NON, new Date()));

    swipe.annulerDecisionDe(bob);

    expect(swipe.getStatut()).toBe(StatutInteraction.NO_MATCH);
  });
});

describe('PolitiqueRewind', () => {
  const politique = new PolitiqueRewind();
  const maintenant = new Date();

  it('refuse un utilisateur sans abonnement', () => {
    expect(politique.peutAnnuler(null, maintenant)).toBe(false);
  });

  it('refuse un abonnement suspendu', () => {
    expect(politique.peutAnnuler(abonnement(alice, StatutAbonnement.SUSPENDU), maintenant)).toBe(
      false,
    );
  });

  it('accepte un abonnement actif', () => {
    expect(politique.peutAnnuler(abonnement(alice), maintenant)).toBe(true);
  });
});

describe('ServiceDecouverte.annulerDerniereDecision', () => {
  it("annule la dernière décision d'un abonné premium", async () => {
    const { service, abonnements } = creerContexte();
    abonnements.seed(abonnement(alice));

    await service.enregistrerDecision(alice, bob, Decision.OUI, new Date(Date.now() - 2000));
    await service.enregistrerDecision(alice, charlie, Decision.NON, new Date(Date.now() - 1000));

    expect(await service.annulerDerniereDecision(alice)).toBe(StatutInteraction.PENDING);
  });

  it('cible bien la décision la plus récente', async () => {
    const { service, interactions, abonnements } = creerContexte();
    abonnements.seed(abonnement(alice));

    await service.enregistrerDecision(alice, charlie, Decision.NON, new Date(Date.now() - 1000));
    await service.enregistrerDecision(alice, bob, Decision.NON, new Date(Date.now() - 2000));

    await service.annulerDerniereDecision(alice);

    const avecCharlie = await interactions.trouverOuCreer(alice, charlie);
    const avecBob = await interactions.trouverOuCreer(alice, bob);
    expect(avecCharlie.getStatut()).toBe(StatutInteraction.PENDING);
    expect(avecBob.getStatut()).toBe(StatutInteraction.NO_MATCH);
  });

  it('refuse un utilisateur gratuit', async () => {
    const { service } = creerContexte();
    await service.enregistrerDecision(alice, bob, Decision.OUI);

    await expect(service.annulerDerniereDecision(alice)).rejects.toThrow(/premium/);
  });

  it("échoue s'il n'y a rien à annuler", async () => {
    const { service, abonnements } = creerContexte();
    abonnements.seed(abonnement(alice));

    await expect(service.annulerDerniereDecision(alice)).rejects.toThrow(/Aucune décision/);
  });
});
