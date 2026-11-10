/** Tout événement métier porte un nom stable et une date de survenue. */
export interface DomainEvent {
  readonly nom: string;
  readonly dateSurvenue: Date;
}
