/** Erros de validacao de formulario, por campo (core/ — agnostico de UI). */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;
