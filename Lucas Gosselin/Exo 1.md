Partie A :

1	Retirer la dernière décision d'une interaction et recalculer son statut	: Interaction parce que y a que interaction qui se soucie d'interaction

2	Vérifier que l'utilisateur a un abonnement actif pour avoir le droit d'annuler	: Abonnement parce que c'est lui qui a toutes les infos pour pouvoir le vérifier (l'utilisateur, les dates, le statut)

3	Retrouver en base la dernière interaction où l'utilisateur a pris une décision	: InteractionRepository parce qu'il a déjà une méthode "trouver ou créer"

4	Orchestrer : vérifier le droit → charger l'interaction → annuler → sauvegarder	: SerivceDecouvert parce que c'est le service qui doit tout contrôler.

5	Déclarer l'interface trouverDerniereDecisionDe(utilisateurId)	: Domaine (policy)

6	Écrire la requête SQL concrète qui lit la dernière interaction	: Adapteur (infra)

7	Décider qu'une annulation remet le statut à PENDING	: Domaine (agrégat)


Partie B : 

1. 
- Le code est dans le domaine mais dépend (import) de inMemoryAbonnementRepository qui vient de infrastructure donc de l'extérieur de notre domaine donc ça fait domaine --> infrastructure alors que ça devrait être dans l'autre sens
