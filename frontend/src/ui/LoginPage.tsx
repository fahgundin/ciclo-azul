/** Tela de boas-vindas para quem ainda nao entrou (inicia o fluxo OIDC no Keycloak). */
export function LoginPage({
  onLogin,
  loading,
}: {
  onLogin: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <section className="waste-page">
      <div className="glass waste-card">
        <h1>Bem-vindo ao Ciclo Azul</h1>
        <p>Entre para acompanhar a água e os resíduos da operação.</p>
        <button className="login-cta" onClick={onLogin} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </section>
  );
}
