# Escopo do Projeto — Ciclo Azul (ODS 6)

> Documento de escopo do produto. Consolida a visão, os perfis de usuário, os
> requisitos funcionais (R01–R10) e o recorte do MVP.
> Fontes: `docs/historias-de-usuario.md` e PRD (`_prd_export/`).

## 1. Visão do produto

O **Ciclo Azul** é um sistema de informação voltado ao **monitoramento do consumo
de água** nos sistemas de refrigeração e ao **rastreamento do descarte de resíduos
químicos e de metais pesados** em data centers.

Objetivos:

- Monitorar em tempo real o uso da água nas unidades.
- Registrar a destinação dos resíduos gerados, garantindo rastreabilidade e
  conformidade ambiental.
- Apontar oportunidades de reuso e redução de desperdício.

O projeto contribui com o **ODS 6 — Água Potável e Saneamento**, reduzindo o
desperdício de água potável e a contaminação do solo e de corpos hídricos pelo
descarte indevido de resíduos, além de facilitar a prestação de contas ambientais.

**Público-alvo:** equipes de gestão ambiental, operadores de infraestrutura e
gestores de empresas responsáveis por grandes data centers.

## 2. Perfis de usuário

| Perfil | Descrição |
|---|---|
| **Administrador** | Responsável pela configuração e pelo acesso ao sistema (TI / gestão da plataforma). |
| **Gestor Ambiental** | Responsável pela conformidade e pela destinação correta de água e resíduos. |
| **Operador** | Atua na infraestrutura do data center (refrigeração, manutenção, facilities). |
| **Diretoria** | Responde pelos resultados e pela prestação de contas da empresa. |

## 3. Requisitos funcionais (R01–R10)

| ID | Descrição resumida | Perfil | Prioridade | Depende de |
|---|---|---|---|---|
| **R04** | Conectar sensores/dispositivos IoT para monitorar consumo de água, ou registrar leituras manuais. | Operador | **Alta** | — |
| **R05** | Monitorar em tempo real o consumo de água dos sistemas de refrigeração por unidade. | Operador | **Alta** | R04 |
| **R07** | Cadastrar e classificar os tipos de resíduos gerados. | Gestor Ambiental | **Alta** | — |
| **R06** | Registrar a destinação de cada lote de resíduo (local, empresa receptora, licença, data, quantidade, comprovante). | Gestor Ambiental | **Alta** | R07 |
| **R09** | Gerar relatórios de conformidade ambiental (PDF/CSV). | Gestor Ambiental | **Alta** | R04, R06, R07 |
| **R01** | Gerenciar perfis de usuário e permissões por nível de acesso. | Administrador | Média | — |
| **R03** | Definir limites de consumo (geral e por unidade) e receber alertas ao ultrapassar. | Gestor Ambiental | Média | R04 |
| **R02** | Apontar oportunidades de reuso e redução de desperdício com base no histórico. | Gestor Ambiental | Média | R04, R05 |
| **R10** | Dashboards com KPIs (% de reuso, água economizada, resíduos destinados corretamente). | Diretoria | Média | R04, R05, R06 |
| **R08** | Alertar sobre lotes de resíduos sem destinação dentro do prazo definido. | Gestor Ambiental | Baixa | R06 |

As histórias de usuário completas e os testes de aceitação (Gherkin) estão em
`docs/historias-de-usuario.md`.

### Grafo de dependências (resumo)

```
R04 (IoT/leituras) ──┬─> R05 (tempo real) ──┬─> R02 (oportunidades)
                     │                      └─> R10 (dashboards)
                     ├─> R03 (limites/alertas)
                     ├─> R09 (relatórios)
                     └─> R02

R07 (tipos de resíduo) ──> R06 (destinação) ──┬─> R08 (alerta sem destinação)
                                              ├─> R09 (relatórios)
                                              └─> R10 (dashboards)
```

R04 e R07 são as raízes: nada de valor funciona sem elas.

## 4. Recorte do MVP

O MVP cobre os requisitos de **prioridade Alta**, respeitando as dependências.

**Incluído no MVP:**

- **R04** — Ingestão de leituras de consumo de água via IoT (sensores mock por MQTT)
  e registro manual de leitura.
- **R05** — Painel de monitoramento em tempo real por unidade, incluindo a regra
  "sem dados recentes".
- **R07** — Cadastro e classificação de tipos de resíduos.
- **R06** — Registro da destinação de lotes de resíduos com comprovante obrigatório.
- **R09** — Relatórios de conformidade em PDF/CSV.
- **Base transversal:** autenticação e autorização por perfil (via Keycloak),
  necessária para todas as telas e rotas (parte de R01 é habilitada pela gestão
  de usuários/roles do próprio Keycloak).

**Fora do MVP (iterações seguintes):**

- **R03** (limites e alertas) e **R02** (oportunidades de reuso) — Média.
- **R10** (dashboards de KPIs) — Média.
- **R01** completo (telas internas de gestão de perfis além do que o Keycloak já
  oferece) — Média.
- **R08** (alerta de lotes sem destinação) — Baixa.

### Observações de regras de negócio a confirmar

Valores que aparecem apenas nos testes de aceitação e precisam ser oficializados
como regra de negócio:

- **"Sem dados recentes"**: 15 minutos sem leitura (ver `docs/contrato-iot.md`).
- **Prazo de destinação (R08)**: "prazo definido" ainda não tem valor; definir
  quando R08 entrar em escopo.

## 5. Requisitos não funcionais (iniciais)

Ponto de atenção: o PRD original lista apenas requisitos funcionais. RNFs a
consolidar:

- **Tempo real (R05):** latência alvo da atualização no painel (sugestão: < 5 s
  da leitura até a tela).
- **Segurança:** autenticação obrigatória em todas as rotas; API de acesso interno
  (ver `docs/arquitetura.md`).
- **Formatos de relatório (R09):** PDF e CSV aceitos por órgãos fiscalizadores.
- **Disponibilidade / retenção de dados / volume de leituras:** a definir.
