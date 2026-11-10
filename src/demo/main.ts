import { AbonnementId, UtilisateurId } from '../domain/ids.js';
import { Decision } from '../domain/decision.js';
import { Abonnement, StatutAbonnement } from '../domain/abonnement.js';
import { QuotaSwipe } from '../domain/quota-swipe.js';
import { PolitiqueExposition } from '../domain/politique-exposition.js';
import { PolitiqueRewind } from '../domain/politique-rewind.js';
import { MatchProduit } from '../domain/events/match-produit.js';
import { ServiceDecouverte } from '../application/service-decouverte.js';
import { InMemoryInteractionRepository } from '../infrastructure/in-memory-interaction-repository.js';
import { InMemoryCompteurSwipeRepository } from '../infrastructure/in-memory-compteur-swipe-repository.js';
import { InMemoryAbonnementRepository } from '../infrastructure/in-memory-abonnement-repository.js';
import { EventBus } from '../infrastructure/event-bus.js';
import { NotificationHandler } from '../infrastructure/notification-handler.js';

/**
 * Point d'entrée de démonstration : câble le domaine, l'application et
 * l'infrastructure (composition root), puis joue un scénario de match.
 */
async function main(): Promise<void> {
  // --- Composition root : on branche les adaptateurs sur les ports. ---
  const interactions = new InMemoryInteractionRepository();
  const compteurs = new InMemoryCompteurSwipeRepository();
  const abonnements = new InMemoryAbonnementRepository();
  const quota = new QuotaSwipe(3, 24 * 60 * 60 * 1000); // 3 swipes gratuits / 24h
  const exposition = new PolitiqueExposition(60 * 60 * 1000); // 1h entre expositions
  const rewind = new PolitiqueRewind();

  const bus = new EventBus();
  const notifications = new NotificationHandler();
  bus.souscrire<MatchProduit>(MatchProduit.NOM, (event) => notifications.handle(event));

  const service = new ServiceDecouverte(
    interactions,
    compteurs,
    abonnements,
    quota,
    exposition,
    rewind,
    bus,
  );

  const alice = UtilisateurId('alice');
  const bob = UtilisateurId('bob');
  const charlie = UtilisateurId('charlie');

  // --- Scénario : Alice et Bob disent OUI => MATCHED. ---
  const r1 = await service.enregistrerDecision(alice, bob, Decision.OUI);
  console.log('Alice -> Bob (OUI):', r1); // PENDING

  const r2 = await service.enregistrerDecision(bob, alice, Decision.OUI);
  console.log('Bob -> Alice (OUI):', r2); // MATCHED

  abonnements.seed(
    new Abonnement(
      AbonnementId('ab-alice'),
      alice,
      new Date(Date.now() - 1000),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      StatutAbonnement.ACTIF,
    ),
  );

  const r3 = await service.enregistrerDecision(alice, charlie, Decision.NON);
  console.log('Alice -> Charlie (NON):', r3);

  const r4 = await service.annulerDerniereDecision(alice);
  console.log('Alice annule sa dernière décision:', r4);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
