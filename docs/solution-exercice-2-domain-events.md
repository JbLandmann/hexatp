# 📝 Solution — Exercice 2 « Domain Events » (étape 2)

> Mes réponses à `exercice-2-domain-events.md`. Le code de la Partie B est
> implémenté dans `src/` et couvert par `tests/domain-events.test.ts`.

---

## 💡 L'idée en une phrase

Un **domain event** est un *fait métier déjà survenu* (`MatchProduit`). Le domaine le **crée**
(il connaît la règle du match), le service le **publie** *après* la sauvegarde, et des **handlers
indépendants** y réagissent — sans que l'émetteur sache qui écoute. C'est du **découplage** :
ajouter une réaction (email, stats, ouverture de chat) = brancher un nouveau handler, zéro
modification du domaine ni du service.

```
Swipe (crée l'event) ──▶ Service (publie après save) ──▶ EventBus ──▶ Handlers (réagissent)
     domaine                    application                 infra         infra/app
```

---

## 🧩 Partie A — Domain events identifiés

| Événement (passé) | Déclencheur | Payload (auto-suffisant) |
|-------------------|-------------|--------------------------|
| **`MatchProduit`** | Une interaction bascule vers `MATCHED` (2 OUI distincts) | `interactionId`, `participantAId`, `participantBId`, `dateSurvenue` |
| **`QuotaSwipeAtteint`** | Un utilisateur gratuit atteint sa limite de swipes sur la fenêtre | `utilisateurId`, `nombreSwipes`, `limite`, `dateSurvenue` |

Pourquoi ces payloads ( contenu d'attributs ) sont **auto-suffisants** :
- `MatchProduit` porte **les deux participants** → le `NotificationHandler` notifie directement,
  sans recharger l'interaction depuis la base.
- `QuotaSwipeAtteint` porte `utilisateurId` + `limite` → un handler peut proposer un upsell
  premium immédiatement.

> Seul `MatchProduit` est implémenté (c'est celui du diagramme de la Partie B).
> `QuotaSwipeAtteint` est identifié ici à titre d'analyse (Partie A).

---

## 🛠️ Partie B — Implémentation (qui fait quoi)

| Rôle | Couche | Fichier | Point clé |
|------|--------|---------|-----------|
| **B.1** `MatchProduit` | Domaine | `src/domain/events/match-produit.ts` | Immuable (`Object.freeze`), implémente `DomainEvent`, nommé au passé |
| **B.2** émission + exposition | Domaine (agrégat) | `src/domain/swipe.ts` | Émet **sur la bascule** vers MATCHED ; `collecterEvenements()` = collect & clear |
| **B.3** publication | Application | `src/application/service-decouverte.ts` | Publie **après** `sauvegarder`, bus **injecté** au constructeur |
| **B.4** handler + câblage | Infra / composition root | `src/demo/main.ts` | `NotificationHandler` abonné via `bus.souscrire('MatchProduit', ...)` |

### Les décisions importantes

**1. Qui crée vs qui publie ?**
Le domaine (`Swipe`) **crée** l'événement car lui seul connaît la règle « 2 OUI = match ».
Le service **publie** car publier est une action d'orchestration (après persistance). Le domaine
n'importe jamais `EventBus` : il ne connaît que l'interface `DomainEvent`.

**2. Émettre uniquement sur la BASCULE**
```typescript
const statutAvant = this.statut;
// ... recalcul de this.statut ...
if (statutAvant !== MATCHED && this.statut === MATCHED) {
  this.enregistrerEvenement(new MatchProduit(...)); // une seule fois
}
```
On mémorise le statut **avant** le recalcul. Sans cette garde, rappeler `determinerResultat()`
ré-émettrait l'événement → notifications en double.

**3. « Collect & clear » pour éviter les doublons**
```typescript
collecterEvenements(): DomainEvent[] {
  const evenements = [...this.evenements];
  this.evenements.length = 0; // on vide : un event publié ne doit pas l'être deux fois
  return evenements;
}
```

**4. Publier APRÈS la persistance (jamais avant)**
```typescript
await this.interactions.sauvegarder(interaction);
// ... puis seulement ...
for (const evenement of interaction.collecterEvenements()) {
  await this.bus.publier(evenement);
}
```
Si on publiait avant de sauvegarder et que la sauvegarde échouait, on aurait notifié un match
qui n'existe pas en base. L'ordre garantit la cohérence.

---

## 🧪 Vérification

- `npm run typecheck` ✅
- `npm test` → **12 tests verts** (dont 6 nouveaux dans `tests/domain-events.test.ts` :
  émission sur match, payload complet, pas d'émission sans match, collect & clear, publication
  via le bus).
- `npm run demo` affiche la réaction du handler :
  ```
  Alice -> Bob (OUI): PENDING
  🔔 Match ! On notifie alice et bob (interaction ...)
  Bob -> Alice (OUI): MATCHED
  ```

---

## ⚠️ Pièges évités

1. **Faire publier le domaine** (`Swipe` appelle le bus) → couple le cœur métier à l'infra.
   Ici le domaine se contente de *mémoriser* l'event ; le service le publie.
2. **Émettre à chaque recalcul** → doublons. Garde sur la bascule `avant !== MATCHED`.
3. **Ne pas vider la liste** → re-publication. Pattern collect & clear.
4. **Publier avant de sauvegarder** → notifier un état non persisté.
5. **Payload maigre** (juste `interactionId`) → le handler devrait recharger la donnée,
   recréant le couplage qu'on voulait supprimer.
