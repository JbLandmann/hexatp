import { UtilisateurId } from '../domain/ids.js';
import { Decision } from '../domain/decision.js';
import { QuotaSwipe } from '../domain/quota-swipe.js';
import { PolitiqueExposition } from '../domain/politique-exposition.js';
import { PolitiqueRewind } from '../domain/politique-rewind.js';
import { ServiceDecouverte } from '../application/service-decouverte.js';
import { InMemoryInteractionRepository } from '../infrastructure/in-memory-interaction-repository.js';
import { InMemoryCompteurSwipeRepository } from '../infrastructure/in-memory-compteur-swipe-repository.js';
import { InMemoryAbonnementRepository } from '../infrastructure/in-memory-abonnement-repository.js';

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
  const service = new ServiceDecouverte(interactions, compteurs, abonnements, quota, exposition, rewind);

  const alice = UtilisateurId('alice');
  const bob = UtilisateurId('bob');

  // --- Scénario : Alice et Bob disent OUI => MATCHED. ---
  const r1 = await service.enregistrerDecision(alice, bob, Decision.OUI);
  console.log('Alice -> Bob (OUI):', r1); // PENDING

  const r2 = await service.enregistrerDecision(bob, alice, Decision.OUI);
  console.log('Bob -> Alice (OUI):', r2); // MATCHED
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
