import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OidcTokenVerifier } from './oidc-token.verifier';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Modulo de autenticacao/autorizacao.
 *
 * Registra DOIS guards globais, na ordem:
 *  1) JwtAuthGuard  — exige token valido (exceto @Public)
 *  2) RolesGuard    — aplica RBAC quando @Roles esta presente
 *
 * Como sao globais (APP_GUARD), valem para toda a aplicacao sem precisar anotar
 * cada controller. Ver docs/arquitetura.md (Seguranca).
 */
@Module({
  providers: [
    OidcTokenVerifier,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [OidcTokenVerifier],
})
export class AuthModule {}
