import { SetMetadata } from '@nestjs/common';

/** Chave de metadado que marca uma rota como publica (sem autenticacao). */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota (ou controller) como publica, isentando-a do JwtAuthGuard global.
 * Use com parcimonia — por padrao, toda rota exige token (ver AGENTS.md secao 1).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
