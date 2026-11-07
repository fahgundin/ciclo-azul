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
| Água em tempo real (R05) | `/agua` | #40 | A fazer |
| Lotes e destinação (R06) | `/residuos` | #41 | Entregue, sobre a API real (com as lacunas abaixo) |
| Relatórios (R09) | `/relatorios` | #42 | A fazer |
| Limites e alertas (R03/R08) | `/alertas` | #43 | A fazer |
| Reuso (R02) | `/insights` | #44 | A fazer |
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
