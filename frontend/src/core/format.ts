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
