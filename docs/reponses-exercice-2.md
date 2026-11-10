# Réponses exercice 2 : Domain Events

## Partie A

| Événement | Déclencheur | Payload |
|-----------|-------------|---------|
| `MatchProduit` | Le statut passe à `MATCHED` | `interactionId`, `participantAId`, `participantBId`, `dateSurvenue` |
| `InteractionRefusee` | Le statut passe à `NO_MATCH` | `interactionId`, `refuseParId`, `autreParticipantId`, `dateSurvenue` |
| `QuotaSwipeAtteint` | Un utilisateur gratuit utilise son dernier swipe de la période | `utilisateurId`, `limiteGratuite`, `dateFinPeriode`, `dateSurvenue` |
| `DecisionAnnulee` | Un abonné fait un rewind | `interactionId`, `utilisateurId`, `decisionAnnulee`, `dateSurvenue` |

## Partie B

| Morceau | Fichier |
|---------|---------|
| `DomainEvent` | `src/domain/events/domain-event.ts` |
| B.1 `MatchProduit` | `src/domain/events/match-produit.ts` |
| B.2 émission et `collecterEvenements` | `src/domain/swipe.ts` |
| B.3 publication après sauvegarde | `src/application/service-decouverte.ts` |
| B.4 handler et câblage | `src/infrastructure/notification-handler.ts`, `src/demo/main.ts` |
| Bus | `src/infrastructure/event-bus.ts` |

Le service dépend d'un port `PublicateurEvenements` que l'`EventBus` implémente, pour que l'application n'importe pas l'infrastructure.

L'événement est émis seulement quand le statut passe à `MATCHED`, et sa date est celle de la décision qui fait le match.

Tests dans `tests/domain-events.test.ts`.
