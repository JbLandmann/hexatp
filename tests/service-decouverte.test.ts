import { describe, it, expect } from 'vitest';
import { UtilisateurId, AbonnementId } from '../src/domain/ids.js';
import { Decision } from '../src/domain/decision.js';
import { StatutInteraction } from '../src/domain/swipe.js';
import { Abonnement, StatutAbonnement } from '../src/domain/abonnement.js';
import { QuotaSwipe } from '../src/domain/quota-swipe.js';
import { PolitiqueExposition } from '../src/domain/politique-exposition.js';
import { PolitiqueRewind } from '../src/domain/politique-rewind.js';
import { ServiceDecouverte } from '../src/application/service-decouverte.js';
import { InMemoryInteractionRepository } from '../src/infrastructure/in-memory-interaction-repository.js';
import { InMemoryCompteurSwipeRepository } from '../src/infrastructure/in-memory-compteur-swipe-repository.js';
import { InMemoryAbonnementRepository } from '../src/infrastructure/in-memory-abonnement-repository.js';
import { EventBus } from '../src/infrastructure/event-bus.js';

function creerService(limiteGratuite = 3) {
  const interactions = new InMemoryInteractionRepository();
  const compteurs = new InMemoryCompteurSwipeRepository();
  const abonnements = new InMemoryAbonnementRepository();
  const quota = new QuotaSwipe(limiteGratuite, 24 * 60 * 60 * 1000);
  const exposition = new PolitiqueExposition(60 * 60 * 1000);
  const rewind = new PolitiqueRewind();
  const bus = new EventBus();
  const service = new ServiceDecouverte(
    interactions,
    compteurs,
    abonnements,
    quota,
    exposition,
    rewind,
    bus,
  );
  return { service, abonnements };
}

describe('ServiceDecouverte.enregistrerDecision', () => {
  it('produit MATCHED quand les deux participants disent OUI', async () => {
    const { service } = creerService();
    const alice = UtilisateurId('alice');
    const bob = UtilisateurId('bob');

    expect(await service.enregistrerDecision(alice, bob, Decision.OUI)).toBe(
      StatutInteraction.PENDING,
    );
    expect(await service.enregistrerDecision(bob, alice, Decision.OUI)).toBe(
      StatutInteraction.MATCHED,
    );
  });

  it('produit NO_MATCH des qu un participant dit NON', async () => {
    const { service } = creerService();
    const alice = UtilisateurId('alice');
    const bob = UtilisateurId('bob');

    await service.enregistrerDecision(alice, bob, Decision.OUI);
    expect(await service.enregistrerDecision(bob, alice, Decision.NON)).toBe(
      StatutInteraction.NO_MATCH,
    );
  });

  it('bloque un utilisateur gratuit au-dela du quota', async () => {
    const { service } = creerService(2);
    const alice = UtilisateurId('alice');

    await service.enregistrerDecision(alice, UtilisateurId('c1'), Decision.OUI);
    await service.enregistrerDecision(alice, UtilisateurId('c2'), Decision.OUI);

    await expect(
      service.enregistrerDecision(alice, UtilisateurId('c3'), Decision.OUI),
    ).rejects.toThrow(/Quota/);
  });

  it('autorise un abonne actif au-dela du quota gratuit', async () => {
    const { service, abonnements } = creerService(1);
    const alice = UtilisateurId('alice');
    abonnements.seed(
      new Abonnement(
        AbonnementId('ab1'),
        alice,
        new Date(Date.now() - 1000),
        new Date(Date.now() + 1_000_000),
        StatutAbonnement.ACTIF,
      ),
    );

    await service.enregistrerDecision(alice, UtilisateurId('c1'), Decision.OUI);
    await expect(
      service.enregistrerDecision(alice, UtilisateurId('c2'), Decision.OUI),
    ).resolves.toBeDefined();
  });
});
