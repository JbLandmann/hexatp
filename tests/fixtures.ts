import { AbonnementId, type UtilisateurId } from '../src/domain/ids.js';
import { Abonnement, StatutAbonnement } from '../src/domain/abonnement.js';
import { QuotaSwipe } from '../src/domain/quota-swipe.js';
import { PolitiqueExposition } from '../src/domain/politique-exposition.js';
import { PolitiqueRewind } from '../src/domain/politique-rewind.js';
import { ServiceDecouverte } from '../src/application/service-decouverte.js';
import { InMemoryInteractionRepository } from '../src/infrastructure/in-memory-interaction-repository.js';
import { InMemoryCompteurSwipeRepository } from '../src/infrastructure/in-memory-compteur-swipe-repository.js';
import { InMemoryAbonnementRepository } from '../src/infrastructure/in-memory-abonnement-repository.js';
import { EventBus } from '../src/infrastructure/event-bus.js';

export function creerContexte(limiteGratuite = 10) {
  const interactions = new InMemoryInteractionRepository();
  const abonnements = new InMemoryAbonnementRepository();
  const bus = new EventBus();
  const service = new ServiceDecouverte(
    interactions,
    new InMemoryCompteurSwipeRepository(),
    abonnements,
    new QuotaSwipe(limiteGratuite, 24 * 60 * 60 * 1000),
    new PolitiqueExposition(60 * 60 * 1000),
    new PolitiqueRewind(),
    bus,
  );
  return { service, interactions, abonnements, bus };
}

export function abonnement(
  utilisateurId: UtilisateurId,
  statut: StatutAbonnement = StatutAbonnement.ACTIF,
): Abonnement {
  return new Abonnement(
    AbonnementId(`ab-${utilisateurId}`),
    utilisateurId,
    new Date(Date.now() - 60_000),
    new Date(Date.now() + 60 * 60 * 1000),
    statut,
  );
}
