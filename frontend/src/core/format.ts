const litersFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const dateUtcFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Numero no padrao pt-BR, ate duas casas decimais (ex.: 1.234,5). */
export function formatNumber(value: number): string {
  return litersFormat.format(value);
}

/** Volume em litros no padrao pt-BR (ex.: 1.234,5 L). */
export function formatLiters(value: number): string {
  return `${litersFormat.format(value)} L`;
}

/**
 * Data (sem hora) de um instante ISO, lida em UTC. Use para datas de calendario
 * guardadas como meia-noite UTC (ex.: leitura manual), que no fuso do Brasil
 * apareceriam um dia antes se lidas em horario local.
 */
export function formatDateUtc(iso: string): string {
  return dateUtcFormat.format(new Date(iso));
}

/** Data e hora locais de um instante ISO (ex.: 05/11/2026, 14:30). */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Iniciais (ate 2 letras, maiusculas) de um nome. Vazio vira "?". */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toUpperCase();
  return letters || '?';
}
