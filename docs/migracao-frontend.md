# Migração do protótipo de frontend (React + TypeScript)

> Acompanha o épico #37. Registra como as telas do protótipo em JavaScript puro
> (`ciclo_azul`) estão sendo reescritas no frontend oficial (`frontend/`), respeitando
> o [ADR 0005](decisoes/0005-pwa-frontend-desacoplado.md), e as **pendências** que a
> migração expõe (AGENTS §7).

## Diretrizes

- O protótipo é **referência de regras e fluxos**, não é copiado. Cada tela é
  reescrita em React + TypeScript.
- `core/` (agnóstico de plataforma) nunca importa de `ui/`. Regras e acesso a dados
  ficam em `core/`; componentes e páginas em `ui/`.
- **Login:** o login simulado do protótipo (senha de demonstração) **não** é portado.
  A autenticação é o Keycloak (OIDC + PKCE).
- **Perfis e permissões:** vêm das roles do realm no access token
  (`administrador`, `gestor-ambiental`, `operador`, `diretoria`). A matriz de
  permissões (`core/auth/permissions.ts`) só decide o que a interface **mostra**;
  a autorização real é do backend em cada rota.
- **Dados:** onde o backend ainda não tem endpoint, cada tela usa uma porta
  (interface) em `core/` com um **adapter em memória** derivado do seed do
  protótipo, marcado como pendência abaixo. Quando o endpoint existir, troca-se só
  o adapter.

## Como entregar uma tela

1. Regras de negócio e acesso a dados em `src/core/<feature>/`, com testes.
2. Página em `src/ui/`, com testes.
3. Registrar a página em `src/ui/pages.tsx`. Ela passa a aparecer no menu dos perfis
   com permissão para a rota (`src/core/navigation/routes.ts`).

## Estado das telas

| Tela | Rota | Issue | Estado |
|---|---|---|---|
| Shell, navegação e rotas por perfil | — | #38 | Entregue |
| Tipos de resíduo (R07) | `/residuos` | #25 | Entregue (antes da migração) |
| Sensores e leitura manual (R04) | `/sensores` | #39 | Entregue, sobre a API real (com as lacunas abaixo) |
| Água em tempo real (R05) | `/agua` | #40 | Entregue, sobre a API real (com as diferenças abaixo) |
| Lotes e destinação (R06) | `/residuos` | #41 | Entregue, sobre a API real (com as lacunas abaixo) |
| Relatórios (R09) | `/relatorios` | #42 | Entregue, **gerado no navegador** (sem endpoint no backend) |
| Limites e alertas (R03/R08) | `/alertas` | #43 | Entregue com **adapters em memória** (sem backend) |
| Reuso (R02) | `/insights` | #44 | Entregue com **adapter em memória** e estimativas de demonstração |
| Painel de KPIs (R10) | `/painel` | #45 | A fazer |
| Usuários (R01) | `/usuarios` | #46 | A fazer |
| Auditoria (RNF02) | `/auditoria` | #47 | A fazer |

Telas sem página registrada não aparecem no menu. Perfil sem nenhuma tela
disponível vê "Em construção".

## Pendências

### Backend sem endpoints para as telas

O backend expõe tipos de resíduo (R07), a ingestão de leituras de água por MQTT com o
canal WebSocket (R04/R05), a API REST de sensores e leituras (`/sensors`,
`/water-readings`, desde o R04, #7), o estado de consumo por unidade
(`/water-status`, desde o R05, #9) e a de lotes e destinação (`/waste-lots`, desde o
R06, #8). Ver `backend/README.md`. Não existem endpoints REST para:

- consumo agregado por período (dia, mês), para R03/R10 — o estado atual
  (`GET /water-status`) e o histórico bruto por unidade (`GET /water-readings?unitId=`)
  já existem;
- limites, alertas e prazo de destinação (R03/R08);
- relatórios (R09);
- oportunidades de reuso (R02);
- KPIs (R10);
- gestão de usuários além do que o Keycloak já oferece (R01);
- trilha de auditoria (RNF02).

Cada tela correspondente usará um adapter em memória até o endpoint existir. A tela
de sensores (#39) usa a API real do R04, com as lacunas abaixo.

### Lacunas do R04 em relação ao protótipo

O backend do R04 cobre o vínculo de sensor, a leitura manual e o histórico. Ficaram
de fora, por falta de base no backend (AGENTS §7):

- **Unidades:** não há cadastro de unidades; qualquer `unitId` é aceito (mesma
  decisão do `contrato-iot.md`, seção 8). Por isso a regra "leitura manual só nas
  unidades do operador" não é aplicada no backend.
- **Sensor "online":** a regra do protótipo fala em unidade sem sensor *online*. O
  backend considera apenas sensor *vinculado* (status "Conectado"); não há
  acompanhamento de conexão/última leitura por sensor.
- **Retificação** de leitura com justificativa mínima, preservando o valor original:
  depende de trilha de auditoria (RNF02) e não foi implementada.
- **Desvincular** sensor: não faz parte dos critérios do R04.

Efeitos na tela de sensores (#39), que difere do protótipo nestes pontos:

- **Dados do sensor:** o backend guarda só `sensorId`, `unitId`, status "Conectado"
  e data de vínculo. Nome do dispositivo, sistema de refrigeração e protocolo do
  protótipo não existem na API e não são exibidos nem pedidos no formulário.
- **Conectar / desconectar:** só há vínculo ("Conectar sensor"). O botão
  Desconectar/Reconectar do protótipo não existe, pelo mesmo motivo do item
  "Desvincular".
- **Unidades:** sem cadastro de unidades, o formulário recebe o identificador da
  unidade digitado (com sugestões das unidades que já têm sensor). A tela mostra o
  que o backend aceita; a validação de formato do identificador do sensor é só do
  backend e sua mensagem é exibida como veio.
- **Histórico de leituras manuais:** `GET /water-readings` exige `unitId`, então o
  histórico é por unidade, escolhida por quem consulta. Unidades que só têm leitura
  manual não aparecem sozinhas: só ficam sugeridas após um lançamento na sessão.
- **Unidade de medida:** a API usa **litros**; o protótipo usava m³. A tela informa e
  exibe litros.
- **Datas de leitura manual:** são datas de calendário gravadas à meia-noite UTC; a
  tela as exibe em UTC para não aparecerem um dia antes no fuso do Brasil.
- **Perfis (inconsistência entre documentação e backend):** a tela `/sensores` é
  exclusiva do **Operador**. Decisão: seguir a documentação de produto, não o
  backend. O motivo é uma divergência que ficou registrada aqui:
  - **Documentação de produto** só prevê o Operador: `escopo.md` (R04, perfil
    Operador) e a HU02 em `historias-de-usuario.md` ("Como um Operador"; os cenários
    de conectar sensor e de leitura manual começam com "estou autenticado como
    Operador"). O protótipo também dá `sensors.manage` só ao Operador.
  - **Backend** aceita **Operador e Administrador** em `POST /sensors`
    (`@Roles(OPERADOR, ADMINISTRADOR)`, listado assim no `backend/README.md`). Nenhum
    documento de produto justifica o Administrador; parece ter sido acrescentado na
    implementação, sem registro do motivo. A leitura manual (`POST
    /water-readings/manual`) é só do Operador, coerente com a documentação.
  - **Efeito:** um Administrador consegue vincular sensor chamando a API
    diretamente, mas não vê a tela. Como a autorização real é do backend, o
    frontend não "bloqueia" nada; apenas não oferece a tela.
  - **A decidir pela equipe** (sem mudar nada antes disso): (a) manter assim;
    (b) liberar a tela ao Administrador e atualizar a HU02; ou (c) restringir o
    backend ao Operador, em issue própria. Se (b), basta conceder a permissão
    `sensors.manage` ao perfil em `core/auth/permissions.ts`.

### Lacunas do R06 em relação ao protótipo

O backend do R06 cobre o registro da destinação (com comprovante obrigatório) e a
listagem. Só os critérios do #8 foram implementados; o restante fica pendente
(AGENTS §7). A tela (#41) usa a API real e **não** aplica no frontend as regras que
o backend não tem, para não inventar regra de negócio:

- **Licença válida na data:** o backend só exige que a licença seja *informada*. Não
  há cadastro de empresas receptoras nem de licenças com validade, então a regra
  "empresa com licença válida na data" do protótipo não é verificada.
- **Dupla confirmação** por outro gestor para resíduo perigoso: depende de uma noção
  de periculosidade, que hoje não existe (a classificação é um texto livre; ver
  "Classificação dos tipos de resíduo" abaixo) e de um fluxo de confirmação.
- **Comprovante:** é uma *referência* (texto ou URL). Upload e armazenamento de
  arquivo não foram implementados.
- **Quantidade:** é um número sem unidade de medida (kg, L, unidades...). A unidade
  precisa ser definida com o negócio.
- **Lotes sem destinação:** registrar a destinação cria o lote já "Destinado". Não
  existe lote pendente, que o R08 (alerta de prazo) vai exigir.

Efeitos na tela de resíduos (#41), que difere do protótipo nestes pontos:

- **Abas:** `/residuos` tem as abas "Destinação de lotes" (R06, abre por padrão) e
  "Tipos de resíduo" (R07, tela que já existia).
- **Só lotes já destinados:** a tela lista lotes com destinação registrada e a etiqueta
  "Destinado". Não há "Novo lote", lote pendente, filtro por situação, prazo para
  destinar nem "Aguardando 2ª confirmação".
- **Formulário de destinação:** tipo de resíduo, local, empresa receptora (texto
  livre), licença (texto livre), data (não futura), quantidade e comprovante. O
  protótipo escolhia a empresa de uma lista com licença e validade; a API não tem
  cadastro de empresas, então não há a regra "licença válida na data".
- **Comprovante:** campo de texto (nº do MTR, nome do arquivo ou link), obrigatório,
  com a mensagem exata do critério de aceitação. Não há envio de arquivo.
- **Quantidade:** sem unidade de medida (o protótipo tinha kg, L, un).
- **Sem retificação** da destinação (depende da trilha de auditoria, RNF02) e sem
  confirmação por segundo gestor.
- **Perfis:** o backend deixa a Diretoria *consultar* os lotes (`GET /waste-lots`), mas
  a rota `/residuos` segue restrita ao Gestor Ambiental (ver "Leitura de tipos de
  resíduo pela Diretoria", abaixo).

### Oportunidades de reuso (R02) — adapter em memória e estimativas de demonstração

**Anotação: esta tela NÃO tem backend e as estimativas NÃO são análise.** O R02 (#13) está
aberto. O que é real e o que é de demonstração:

| O quê | De onde vem |
|---|---|
| Unidades, leituras, consumo-base e **quais unidades têm histórico suficiente** | **API real** (`/water-status`, `/water-readings`) |
| **Catálogo de oportunidades** e **percentuais de economia** (6%, 8%, 5%) | **Fixos de demonstração**, vindos do protótipo (`core/reuse/opportunities.ts`) |
| **Oportunidades aplicadas** | **Adapter em memória** (`InMemoryAppliedStore`; some ao recarregar) |

A economia estimada é `percentual do catálogo × consumo mensal medido` da unidade. O
percentual não sai de nenhuma análise do histórico: é um valor de referência fixo. A tela
exibe essa observação, e a evidência de cada cartão diz isso.

Como funciona:

- **Histórico suficiente (HU05, cenário 1):** unidade com ao menos 2 leituras nos últimos
  30 dias, **24 horas ou mais entre a primeira e a última leitura** e **última leitura de
  no máximo 24 horas atrás** recebe recomendações com a estimativa de economia em litros
  por mês. O consumo mensal é a soma das leituras escalada para 30 dias (pressupõe
  leituras incrementais, a confirmar no contrato). Com menos de 7 dias de leituras o
  cartão avisa "Baixa confiança": a extrapolação para 30 dias é frágil.
- **Sem leituras recentes:** a unidade que tem histórico, mas cuja última leitura tem mais
  de 24 horas (sensor parado), aparece em "Sem leituras recentes" e não recebe
  recomendação com base em dado antigo. Os dois limites de 24 horas são valores de
  demonstração.
- **Resumo:** rotulado "estimado — demonstração"; "marcados como aplicados (estimativa)"
  vale só o que alguém marcou neste navegador, sem medição. As três oportunidades partem
  do mesmo consumo-base e não são independentes: a soma pode superestimar a economia.
- **Sem histórico suficiente (HU05, cenário 2):** a unidade aparece em "Sem histórico
  suficiente" com a mensagem "Não há histórico suficiente para gerar recomendações". As 24
  horas são um valor de demonstração; o critério oficial ainda não foi definido.
- **Catálogo:** reaproveitar a água de purga e captar água de chuva (toda unidade com
  histórico) e aumentar os ciclos de concentração (só a unidade de maior consumo).
- **Aplicar:** só o Gestor (`insights.apply`); a oportunidade vai para "Já aplicadas" e
  o potencial de economia é abatido.

- **Tentar de novo:** se a carga falhar, a tela oferece "Tentar de novo" (antes só
  recarregando a página).

Diferenças em relação ao protótipo:

- **Sem "Investigar vazão noturna"**: dependia de dados de vazão que a API não tem e de uma
  evidência inventada ("vazão noturna 14% acima da base"). Não foi portado.
- **Evidências** agora citam o consumo medido de fato, em vez de frases fixas do protótipo.
- **Unidade** em litros por mês (o protótipo usava m³).
- **Sem registro de auditoria** ao aplicar (RNF02 sem backend).

### Limites e alertas (R03/R08) — adapters em memória

Os adapters em memória (limites, lotes pendentes e oportunidades aplicadas) valem **por
sessão de login** (`ui/useSessionStores.ts`, chaveado pelo usuário logado): somem ao sair,
ao trocar de usuário e ao recarregar, mas não quando o token é renovado.

**Anotação: esta tela NÃO tem backend.** Os requisitos R03 (#12) e R08 (#15) estão
abertos. O que é real e o que é simulado:

| O quê | De onde vem |
|---|---|
| Estado das unidades, leituras (consumo do dia) | **API real** (`/water-status`, `/water-readings`, WebSocket) |
| Tipos de resíduo, destinação de lote | **API real** (`/waste-types`, `POST /waste-lots`) |
| **Limites diários** | **Adapter em memória** (`InMemoryLimitStore`, `core/limits/limits.ts`) |
| **Lotes aguardando destinação** e seu **prazo** | **Adapter em memória** (`InMemoryPendingLotStore`, `core/waste/pending-lot.ts`) |
| **Alertas** | **Calculados no navegador** a cada avaliação (`core/alerts/alerts.ts`) |

Os adapters em memória valem **só até recarregar a página** e só neste navegador (um
par por login). Quando os endpoints existirem, basta implementar as portas `LimitStore`
e `PendingLotStore` sobre a API. A tela exibe essa observação.

Como funciona:

- **Limites (HU04):** o Gestor define limites em litros/dia, geral e por unidade; campo
  vazio é "sem limite". A tela mostra, por limite, o consumo do dia, a porcentagem e uma
  barra (com ícone e texto, nunca só cor).
- **Entrada inválida:** o campo é `type="number"`; texto que o navegador recusa (ex.: `1e`)
  não vira "sem limite": mostra o erro de valor inválido e não salva.
- **Alerta de limite:** crítico quando o consumo do dia **passa** do limite (estritamente
  maior); aviso a partir de 80%. O limite geral soma todas as unidades.
- **Consumo do dia:** soma das leituras do dia **(UTC)**, em litros. Pressupõe leituras
  incrementais; o significado do `value` ainda precisa ser confirmado (mesma pendência
  dos relatórios). Leituras recebidas pelo WebSocket entram na hora, **todas as da sessão**
  (a tela de alertas não usa o teto de 60 leituras do gráfico, senão as mais antigas
  sairiam da soma). Se a conexão cair e voltar, o histórico é buscado de novo para
  recuperar o que chegou com a conexão fora.
- **Lotes pendentes (HU08):** em `/residuos`, seção "Aguardando destinação" com "Novo
  lote" (tipo, quantidade, prazo). "Registrar destinação" abre o formulário já preenchido,
  grava pela **API real** e só então remove o lote pendente (se o backend recusar, ele
  continua pendente).
- **Etiqueta de prazo:** "No prazo"/"Prazo vencido" é recalculada a cada minuto; um lote
  que vence com a tela aberta muda sozinho.
- **Alerta de lote (HU08):** crítico só quando o prazo **já expirou** e não há destinação.
  Lote dentro do prazo **não** gera alerta (cenário 2 da HU08).
- **Unidade sem dados recentes:** alerta de atenção para a unidade que tinha leitura e
  parou há mais de 15 minutos (substitui o "sensor offline" do protótipo, que não tem
  base na API).

Diferenças em relação ao protótipo e limites conhecidos:

- **Sem aviso "vence em N dias"** para lote no prazo: o protótipo avisava, mas a HU08
  manda **não** alertar lote dentro do prazo. Seguimos a HU.
- **Prazo de destinação fictício:** 30 dias por padrão, editável por lote. O prazo oficial
  ainda não foi definido (ver "Prazo de destinação (R08)", abaixo).
- **Sem notificação** por push ou e-mail ao Gestor; os alertas só aparecem na tela. A HU
  fala em "notificar o Gestor responsável pela unidade".
- **Sem "responsável pela unidade"**: não há cadastro de unidades nem vínculo
  operador-unidade; o Operador vê os alertas de **todas** as unidades. O protótipo
  restringia pelo vínculo (RN03).
- **Sem alerta de licença de empresa** (não há cadastro de empresas e licenças com validade).
- **Perfis:** nova permissão `alerts.view` (Gestor e Operador), rota `/alertas`. Só o
  Gestor define limites (`water.limits`) e vê lotes pendentes.
- **Sem sino com contador** na barra superior; os alertas ficam na aba "Alertas".

### Água em tempo real (R05)

A tela `/agua` usa a **API real**: `GET /water-status` (estado atual de cada unidade) e o
WebSocket já existente (`RealtimeClient`, evento `reading`). Sem adapter em memória.

Como funciona:

- **Consumo atual** de cada unidade é o valor da última leitura (litros), com o instante
  e a origem (sensor ou leitura manual). A cada leitura recebida pelo WebSocket, o valor é
  atualizado sem recarregar (HU03, cenário 1).
- **"Sem dados recentes"** (HU03, cenário 2): o backend não emite essa transição pelo
  WebSocket (`contrato-iot.md`, seção 5). O cliente **recalcula o estado a cada 30
  segundos** com `lastReadingAt` e `staleAfterMinutes` (regra dos 15 minutos; exatamente
  15 ainda é recente). Uma leitura nova tira a unidade desse estado.
- **Unidades:** as que `GET /water-status` devolve (com sensor ou com alguma leitura).
  O cliente assina cada uma no WebSocket ao carregar; uma unidade nova só entra na tela
  ao tocar em "Atualizar".
- **Reconexão:** o socket.io reconecta sozinho, mas o servidor esquece as salas
  (*rooms*) da conexão perdida. O `RealtimeClient` avisa (`onReconnect`) a cada
  reconexão; a tela assina de novo todas as unidades e recarrega o estado
  (`GET /water-status`). Ainda não há indicador visual do estado da conexão.
- **Gráfico:** últimas leituras (até 60) da unidade escolhida: histórico de
  `GET /water-readings` mais as leituras recebidas ao vivo, com o eixo X proporcional ao
  tempo. O rótulo do meio do eixo fica no instante médio (não no ponto do meio por
  índice).
- **Atualizar:** o botão mostra "Atualizando…" e fica desabilitado durante a busca. Se uma
  leitura chegar pelo WebSocket enquanto o `GET /water-status` está em voo, o snapshot,
  mais antigo, não a sobrescreve (vale o `lastReadingAt` mais recente de cada unidade).

Diferenças em relação ao protótipo e limites conhecidos:

- **Sem limites diários nem barras de % do limite** (R03/R08, #43 — sem backend). Sem
  "Definir limites de consumo".
- **Sem vazão (m³/h) nem consumo "hoje"**: a API só dá o valor da última leitura, em
  litros. O significado exato do `value` (volume por intervalo ou acumulado do
  medidor) ainda não está definido no contrato (`contrato-iot.md`, seção 8): por isso a
  tela não soma leituras nem calcula vazão. Pendência.
- **Sem lista de sensores por unidade** nesta tela (está em `/sensores`) e sem
  "Exportar histórico (CSV)" — o relatório de consumo em CSV está em `/relatorios`.
- **"Simular pico de consumo"** do protótipo era só demonstração com telemetria
  simulada; não foi portado. Para demonstrar, use o `mock-sensors`.
- **Estado da conexão:** a tela não mostra se o WebSocket está conectado (o cliente
  atual não expõe esse estado). Se cair, o valor para de atualizar e a unidade passa a
  "Sem dados recentes" depois de 15 minutos.
- **Perfis:** a rota `/agua` vale para Operador e Gestor Ambiental (permissão
  `water.monitor`). A HU03 cita o Operador; o Gestor também a vê, como no protótipo.
  Com isso, a primeira tela de ambos passou a ser "Água".

### Relatórios (R09) — adapter no cliente

**Anotação: esta tela NÃO usa endpoint de relatórios.** O backend do R09 (#10) está
aberto. O relatório de conformidade é **montado no navegador** a partir das APIs reais
que já existem (`/sensors`, `/water-readings`, `/waste-lots`, `/waste-types`). O ponto
de troca é `core/reports/report.ts` (`buildReport`) e a porta `ReportDataSource`
(`core/reports/report-data-source.ts`): quando houver endpoint, a fonte de dados passa a
chamá-lo e o restante da tela continua.

Como funciona:

- **Tipos:** conformidade completa, consumo de água e destinação de resíduos. **Período:**
  últimos 7, 30 ou 90 dias.
- **PDF:** pela impressão do navegador ("Salvar como PDF"), sem biblioteca de PDF. A
  área de impressão mostra só o relatório (`ui/styles/reports.css`).
- **CSV:** separador `;`, BOM e vírgula decimal, para o Excel pt-BR. Textos que começam
  com `=`, `+`, `-` ou `@` recebem um apóstrofo, para não virarem fórmula na planilha.
- **Histórico de exportações:** só da sessão atual, **em memória** (a trilha de
  auditoria, RNF02, não existe).
- A tela exibe uma observação visível dizendo que o relatório é gerado no navegador.
  A **mesma ressalva vai dentro dos arquivos exportados** (rodapé do PDF e linha de
  "Atenção" no cabeçalho do CSV), porque são eles que circulam como documento.
- Durante "Gerando…" os campos de tipo e período ficam desabilitados, para o relatório
  gravado sempre corresponder ao filtro selecionado.

Diferenças em relação ao protótipo e limites conhecidos:

- **Itens verificados:** só fatos que os dados permitem confirmar: comprovante e licença
  informados em toda destinação; unidades com leitura nos 15 minutos anteriores **à geração
  do relatório** (não ao período escolhido); consumo registrado em todas as unidades no
  período. Não há "licença válida na data", "dupla
  confirmação" nem "dentro do prazo de destinação" (sem base no backend).
- **Sem reuso nem limite diário** no consumo (R02 e R03 sem backend).
- **Unidades:** só entram as unidades com sensor vinculado (não há cadastro de
  unidades). Unidades que só têm leitura manual ficam de fora.
- **Consumo do período:** a coluna se chama "Soma das leituras (L)" e é a **soma** dos
  valores das leituras do período, em litros.
  Isso supõe leituras incrementais; o significado exato do `value` da leitura (volume
  por intervalo ou acumulado) precisa ser confirmado em `contrato-iot.md`. Pendência.
- **Volume de dados:** o histórico de cada unidade é baixado inteiro. Para muitas
  leituras, será preciso filtrar por período no backend.
- **Geração e "assinatura" no servidor:** o protótipo já previa relatórios gerados no
  servidor; a geração no cliente não tem valor de prova perante órgãos fiscalizadores.

### Classificação dos tipos de resíduo

O seed do protótipo classifica resíduos por **classe** (I, IIA, IIB) e **categoria**
(Químico, Metal pesado, Sólido, Efluente). O contrato atual
(`packages/contracts`, `WasteTypeView`) tem apenas `name` e `classification`.
Alterar o contrato e o backend é decisão de outra issue; **não faz parte** desta
migração.

### Leitura de tipos de resíduo pela Diretoria

No protótipo, a Diretoria consulta os resíduos (somente leitura). No backend,
`GET /waste-types` é restrito ao perfil Gestor Ambiental (`@Roles`). Por isso a rota
`/residuos` exige a permissão `waste.types` (somente Gestor). Quando o backend
liberar a leitura à Diretoria, passar a rota para `waste.view`.

### Prazo de destinação (R08)

O "prazo definido" de destinação de lotes ainda não tem valor oficial
(ver [escopo.md](escopo.md)). Os 15 e 30 dias do seed do protótipo são fictícios.

### Gráficos e telemetria

A telemetria do protótipo é simulada em tempo acelerado. Na migração, o tempo real
usa o `realtime-client` (WebSocket) já existente; a simulação não é portada.

Para a tela de água em tempo real (#40): ao abrir, buscar o estado atual em
`GET /water-status` (ou `/water-status/:unitId`) e atualizar o valor a cada evento
`reading` do WebSocket. O WebSocket **não** avisa quando uma unidade passa a "Sem dados
recentes" (isso é calculado na consulta): a tela deve recalcular periodicamente com
`lastReadingAt` e `staleAfterMinutes`, ou consultar de novo. O rótulo oficial é
`NO_RECENT_DATA_LABEL` (`@ciclo-azul/contracts`). Unidades só com leitura manual
também ficam em "Sem dados recentes" após 15 minutos, pois a data da leitura manual é
de dia inteiro.
