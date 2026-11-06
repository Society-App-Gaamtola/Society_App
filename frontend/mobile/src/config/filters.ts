/** Filter chips for lists grouped by event category. */
export const CATEGORY_FILTERS = ['All', 'Festival', 'Aarti', 'Cultural', 'Meeting'] as const;

export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];
