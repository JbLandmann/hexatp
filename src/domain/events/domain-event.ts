/**
 * Contrat d'un domain event : un fait métier déjà survenu.
 * Il vit dans le domaine car c'est le cœur métier qui sait ce qui s'est passé.
 * Tout événement porte un nom stable (au passé) et une date de survenue.
 */
export interface DomainEvent {
  readonly nom: string;
  readonly dateSurvenue: Date;
}
