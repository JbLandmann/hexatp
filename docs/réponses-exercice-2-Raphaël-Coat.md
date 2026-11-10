# 🎯 Exercice 2 — Domain Events : identifier et réagir

## 🧩 Partie A — Analyser : identifier des domain events (10 min)


| Événement (nom au passé) | Déclencheur (quand ?) | Données transportées (payload) |
|--------------------------|------------------------|--------------------------------|
| QuotaSwipesAtteint | Lorsqu'un utilisateur effectue un swipe alors que son compteur atteint la limite autorisée par son abonnement | userId, compteurActuel, date |
| DecisionEnregistree | Lorsqu'un utilisateur enregistre une décision (OUI ou NON) sur une interaction | interactionId, userId, decision, date |


## 🛠️ Partie B — Appliquer & Créer : implémenter à partir du diagramme (30 min)

voir Pull request

**B.1 — L'événement `MatchProduit`** (`src/domain/events/match-produit.ts`)
Un objet immuable implémentant `DomainEvent`, portant de quoi notifier les deux participants.




**B.2 — L'agrégat émet et expose ses événements** (`src/domain/swipe.ts`)
- Un tableau privé d'événements.
- Dans `determinerResultat()`, quand on **bascule** vers `MATCHED`, appeler `enregistrerEvenement(new MatchProduit(...))`.
- Une méthode `collecterEvenements(): DomainEvent[]` qui **retourne puis vide** la liste (pattern « collect & clear »).




**B.3 — Le service publie après sauvegarde** (`src/application/service-decouverte.ts`)
Dans `enregistrerDecision`, **après** `sauvegarder`, récupérer les événements de l'agrégat et les
publier sur le bus (reçu par **injection** dans le constructeur).




**B.4 — Un handler + le câblage** (composition root / `demo`)
Un `NotificationHandler` qui réagit à `MatchProduit` (un simple `console.log` suffit), abonné au bus
via `bus.souscrire('MatchProduit', ...)`.