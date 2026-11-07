const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
// Valores minusculos (ex.: 0,004) nao podem virar "0": mostra 2 algarismos significativos.
const tinyFormat = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 2 });
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

/**
 * Numero no padrao pt-BR, ate duas casas decimais (ex.: 1.234,5). Valor diferente de
 * zero e menor que 0,01 mostra 2 algarismos significativos (0,004 nao vira "0").
 */
export function formatNumber(value: number): string {
  const tiny = value !== 0 && Math.abs(value) < 0.01;
  return (tiny ? tinyFormat : numberFormat).format(value);
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Hora local (HH:mm) de um instante em milissegundos. */
export function formatTime(timestampMs: number): string {
  return timeFormat.format(new Date(timestampMs));
}

/** Volume em litros no padrao pt-BR (ex.: 1.234,5 L). */
export function formatLiters(value: number): string {
  return `${formatNumber(value)} L`;
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
