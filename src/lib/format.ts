const DATE_TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Data e hora no fuso do navegador (ex.: 27/09/2026, 14:05). Devolve o texto original se não for uma data. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DATE_TIME_FORMAT.format(date);
}
