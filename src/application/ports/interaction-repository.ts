import type { Swipe } from '../../domain/swipe.js';
import type { UtilisateurId } from '../../domain/ids.js';

/**
 * Port (côté application) : accès aux interactions.
 * L'implémentation concrète (DB, mémoire...) vit dans l'infrastructure.
 */
export interface InteractionRepository {
  /** Récupère l'interaction entre deux participants ou en crée une neuve. */
  trouverOuCreer(participantAId: UtilisateurId, participantBId: UtilisateurId): Promise<Swipe>;

  /** Récupère la dernière interaction où l'utilisateur a pris une décision. */
  trouverDerniereDecisionDe(utilisateurId: UtilisateurId): Promise<Swipe | null>;

  /** Persiste l'état de l'interaction. */
  sauvegarder(interaction: Swipe): Promise<void>;
}
