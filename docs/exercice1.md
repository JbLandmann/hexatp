# Nathan Chaput - Exercice 1

## Partie A

A = Domaine (agrégat) | B = Domaine (policy) | C = Port (application) | D = Service applicatif | E = Adaptateur (infra)

1. A, parce que Swipe sait retirer une décision et recalculer
2. B, parce que c'est une règle : seul un premium peut annuler
3. E, parce que c'est aller chercher en base
4. D, parce que le service fait juste l'ordre : vérifier → charger → annuler → sauvegarder
5. C, parce que c'est juste dire ce qu'on a besoin, pas comment le faire
6. E, parce que c'est écrire comment aller chercher en base
7. B (faux → c'est A), parce que j'ai confondu policy et agrégat : c'est Swipe qui recalcule, pas une règle oui/non

## Partie B

1. Le domaine importe l'infrastructure. Les dépendances doivent pointer vers le centre, pas l'inverse.

2. Le repository est créé à l'intérieur de la policy. On ne peut pas injecter de données de test, et on ne peut pas maîtriser la date.

3. `peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean`

## Partie B'

```
Utilisateur → Service : annulerDerniereDecision(utilisateurId)
Service → AbonnementRepository : obtenirActif(utilisateurId)
Service → PolitiqueRewind : peutAnnuler(abonnement, maintenant)
Service → InteractionRepository : trouverDerniereDecisionDe(utilisateurId)
Service → Swipe : annulerDecisionDe(utilisateurId)
Service → InteractionRepository : sauvegarder(swipe)
Service → Utilisateur : statut
```

## Partie C

### C.1 - src/domain/swipe.ts

```typescript
annulerDecisionDe(emetteurId: UtilisateurId): void {
  const index = this.decisions.findIndex((d) => d.emetteurId === emetteurId);
  if (index === -1) {
    return;
  }
  this.decisions.splice(index, 1);
  this.determinerResultat();
}
```

### C.2 - src/domain/politique-rewind.ts

```typescript
import type { Abonnement } from './abonnement.js';

export class PolitiqueRewind {
  peutAnnuler(abonnement: Abonnement | null, aLaDate: Date): boolean {
    return abonnement !== null && abonnement.estActif(aLaDate);
  }
}
```

### C.3 - src/application/ports/interaction-repository.ts

```typescript
trouverDerniereDecisionDe(utilisateurId: UtilisateurId): Promise<Swipe | null>;
```

### C.4 - src/application/service-decouverte.ts

```typescript
async annulerDerniereDecision(
  utilisateurId: UtilisateurId,
  maintenant: Date = new Date(),
): Promise<StatutInteraction> {
  const abonnement = await this.abonnements.obtenirActif(utilisateurId);
  if (!this.rewind.peutAnnuler(abonnement, maintenant)) {
    throw new Error('Rewind réservé aux abonnés premium actifs');
  }

  const interaction = await this.interactions.trouverDerniereDecisionDe(utilisateurId);
  if (interaction === null) {
    throw new Error('Aucune décision à annuler');
  }

  interaction.annulerDecisionDe(utilisateurId);
  await this.interactions.sauvegarder(interaction);

  return interaction.getStatut();
}
```
