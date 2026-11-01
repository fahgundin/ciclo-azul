# Tarefa 03 — Histórias de Usuário e Testes de Aceitação

**Projeto:** Ciclo Azul (ODS 6 — Água Potável e Saneamento)
**Equipe:** Arthur Castro, Cauã Rosa, Guilherme Magalhães, Arthur Fagundes

> Documento elaborado a partir dos Requisitos Funcionais (R01–R10) definidos na Tarefa 02 — Requisitos de Software.
> Cada História de Usuário corresponde a um Requisito Funcional e possui, no mínimo, dois Testes de Aceitação em sintaxe Gherkin.

---

## História de Usuário 01 — Gerenciar perfis e permissões de usuário
> Referência: **R01** (Prioridade: Média)

**Como um** Administrador,
**eu gostaria de** gerenciar os perfis de usuário e suas permissões por nível de acesso,
**para** garantir que cada pessoa acesse apenas as funcionalidades compatíveis com a sua função.

### Testes de Aceitação

```gherkin
Funcionalidade: Gerenciar perfis e permissões de usuário

Cenário: Criar um novo usuário com perfil definido
  Dado que estou autenticado como Administrador
  Quando eu cadastrar um novo usuário informando nome, e-mail e o perfil "Operador"
  Então o sistema deve criar o usuário com o perfil "Operador"
  E o novo usuário deve ter acesso apenas às funcionalidades permitidas a esse perfil

Cenário: Impedir acesso a funcionalidade não autorizada
  Dado que estou autenticado como Operador
  Quando eu tentar acessar a tela de gerenciamento de usuários
  Então o sistema deve negar o acesso
  E exibir a mensagem "Você não tem permissão para acessar esta funcionalidade"
```

---

## História de Usuário 02 — Conectar sensores IoT e registrar leituras de consumo
> Referência: **R04** (Prioridade: Alta)

**Como um** Operador,
**eu gostaria de** conectar sensores e dispositivos IoT para monitorar o consumo de água, ou registrar leituras manualmente quando não houver sensor,
**para** garantir que o consumo de cada unidade seja sempre registrado no sistema.

### Testes de Aceitação

```gherkin
Funcionalidade: Conectar sensores IoT e registrar leituras de consumo

Cenário: Conectar um sensor IoT com sucesso
  Dado que estou autenticado como Operador
  E que possuo um sensor IoT com identificador válido
  Quando eu vincular o sensor a uma unidade de refrigeração
  Então o sistema deve registrar o sensor como "Conectado"
  E passar a receber automaticamente as leituras de consumo de água

Cenário: Registrar leitura manual na ausência de sensor
  Dado que estou autenticado como Operador
  E que a unidade não possui sensor IoT disponível
  Quando eu informar manualmente a leitura de consumo de água e a data
  Então o sistema deve registrar a leitura manual associada à unidade
  E a leitura deve ficar disponível no histórico de consumo
```

---

## História de Usuário 03 — Monitorar consumo de água em tempo real
> Referência: **R05** (Prioridade: Alta — depende de R04)

**Como um** Operador,
**eu gostaria de** monitorar em tempo real o consumo de água dos sistemas de refrigeração de cada unidade,
**para** identificar rapidamente anomalias e agir antes que o desperdício aumente.

### Testes de Aceitação

```gherkin
Funcionalidade: Monitorar consumo de água em tempo real

Cenário: Exibir consumo atualizado de uma unidade
  Dado que estou autenticado como Operador
  E que a unidade "Data Center SP-01" possui sensor conectado enviando leituras
  Quando eu abrir o painel de monitoramento em tempo real dessa unidade
  Então o sistema deve exibir o consumo de água atual da unidade
  E atualizar o valor conforme novas leituras forem recebidas

Cenário: Indicar unidade sem leitura recente
  Dado que estou autenticado como Operador
  E que a unidade "Data Center RJ-02" não envia leituras há mais de 15 minutos
  Quando eu abrir o painel de monitoramento em tempo real dessa unidade
  Então o sistema deve sinalizar a unidade como "Sem dados recentes"
```

---

## História de Usuário 04 — Definir limites de consumo e receber alertas
> Referência: **R03** (Prioridade: Média — depende de R04)

**Como um** Gestor Ambiental,
**eu gostaria de** definir limites de consumo de água, geral e por unidade, e receber alertas quando forem ultrapassados,
**para** controlar o uso da água e evitar o desperdício além do planejado.

### Testes de Aceitação

```gherkin
Funcionalidade: Definir limites de consumo e receber alertas

Cenário: Cadastrar limite de consumo por unidade
  Dado que estou autenticado como Gestor Ambiental
  Quando eu definir um limite de 10.000 litros/dia para a unidade "Data Center SP-01"
  Então o sistema deve salvar o limite associado à unidade
  E passar a monitorar o consumo em relação a esse limite

Cenário: Gerar alerta ao ultrapassar o limite
  Dado que a unidade "Data Center SP-01" possui limite de 10.000 litros/dia
  E que o consumo registrado no dia atingiu 10.500 litros
  Quando o sistema processar a nova leitura de consumo
  Então o sistema deve gerar um alerta de limite ultrapassado
  E notificar o Gestor Ambiental responsável pela unidade
```

---

## História de Usuário 05 — Apontar oportunidades de reuso e redução de desperdício
> Referência: **R02** (Prioridade: Média — depende de R04 e R05)

**Como um** Gestor Ambiental,
**eu gostaria de** receber do sistema a indicação de oportunidades de reuso e redução de desperdício de água com base no histórico de consumo de cada unidade,
**para** tomar decisões que reduzam o uso de água potável e aumentem a sustentabilidade da operação.

### Testes de Aceitação

```gherkin
Funcionalidade: Apontar oportunidades de reuso e redução de desperdício

Cenário: Sugerir oportunidade com base no histórico
  Dado que estou autenticado como Gestor Ambiental
  E que a unidade "Data Center SP-01" possui histórico de consumo suficiente
  Quando eu acessar a seção de oportunidades de reuso
  Então o sistema deve apresentar ao menos uma recomendação de redução ou reuso de água
  E indicar a estimativa de economia associada

Cenário: Indicar ausência de dados suficientes
  Dado que estou autenticado como Gestor Ambiental
  E que a unidade "Data Center RS-05" foi cadastrada há menos de um dia
  Quando eu acessar a seção de oportunidades de reuso dessa unidade
  Então o sistema deve informar que não há histórico suficiente para gerar recomendações
```

---

## História de Usuário 06 — Cadastrar e classificar tipos de resíduos
> Referência: **R07** (Prioridade: Alta)

**Como um** Gestor Ambiental,
**eu gostaria de** cadastrar e classificar os tipos de resíduos gerados pela operação,
**para** padronizar o registro e permitir o controle correto da destinação de cada resíduo.

### Testes de Aceitação

```gherkin
Funcionalidade: Cadastrar e classificar tipos de resíduos

Cenário: Cadastrar um novo tipo de resíduo
  Dado que estou autenticado como Gestor Ambiental
  Quando eu cadastrar o resíduo "Óleo de refrigeração" com a classificação "Metal pesado"
  Então o sistema deve salvar o tipo de resíduo com a classificação informada
  E o resíduo deve ficar disponível para registro de destinação

Cenário: Impedir cadastro sem classificação
  Dado que estou autenticado como Gestor Ambiental
  Quando eu tentar cadastrar um tipo de resíduo sem informar a classificação
  Então o sistema deve bloquear o cadastro
  E exibir a mensagem "A classificação do resíduo é obrigatória"
```

---

## História de Usuário 07 — Registrar a destinação de lotes de resíduos
> Referência: **R06** (Prioridade: Alta — depende de R07)

**Como um** Gestor Ambiental,
**eu gostaria de** registrar a destinação de cada lote de resíduo (local, empresa receptora, licença, data, quantidade e comprovante),
**para** manter o rastreamento completo do descarte e garantir a conformidade ambiental.

### Testes de Aceitação

```gherkin
Funcionalidade: Registrar a destinação de lotes de resíduos

Cenário: Registrar destinação completa de um lote
  Dado que estou autenticado como Gestor Ambiental
  E que existe o tipo de resíduo "Óleo de refrigeração" cadastrado
  Quando eu registrar a destinação informando local, empresa receptora, licença, data, quantidade e comprovante
  Então o sistema deve salvar o registro de destinação do lote
  E o lote deve constar como "Destinado"

Cenário: Impedir registro sem comprovante
  Dado que estou autenticado como Gestor Ambiental
  Quando eu tentar registrar a destinação de um lote sem anexar o comprovante
  Então o sistema deve bloquear o registro
  E exibir a mensagem "O comprovante de destinação é obrigatório"
```

---

## História de Usuário 08 — Alertar sobre lotes de resíduos sem destinação
> Referência: **R08** (Prioridade: Baixa — depende de R06)

**Como um** Gestor Ambiental,
**eu gostaria de** ser alertado sobre lotes de resíduos sem destinação registrada dentro do prazo definido,
**para** evitar o acúmulo irregular de resíduos e o descumprimento das normas ambientais.

### Testes de Aceitação

```gherkin
Funcionalidade: Alertar sobre lotes de resíduos sem destinação

Cenário: Gerar alerta de lote vencido sem destinação
  Dado que existe um lote de resíduo gerado há mais tempo que o prazo definido
  E que esse lote ainda não possui destinação registrada
  Quando o sistema executar a verificação de prazos
  Então o sistema deve gerar um alerta de lote pendente de destinação
  E notificar o Gestor Ambiental responsável

Cenário: Não alertar lote dentro do prazo
  Dado que existe um lote de resíduo sem destinação registrada
  E que o prazo definido para destinação ainda não expirou
  Quando o sistema executar a verificação de prazos
  Então o sistema não deve gerar alerta para esse lote
```

---

## História de Usuário 09 — Gerar relatórios de conformidade ambiental
> Referência: **R09** (Prioridade: Alta — depende de R04, R06 e R07)

**Como um** Gestor Ambiental,
**eu gostaria de** gerar relatórios de conformidade ambiental em formato aceito por órgãos fiscalizadores (PDF/CSV),
**para** facilitar a prestação de contas ambientais da empresa aos órgãos reguladores.

### Testes de Aceitação

```gherkin
Funcionalidade: Gerar relatórios de conformidade ambiental

Cenário: Gerar relatório em PDF
  Dado que estou autenticado como Gestor Ambiental
  E que existem dados de consumo de água e destinação de resíduos no período selecionado
  Quando eu solicitar a geração do relatório de conformidade no formato PDF
  Então o sistema deve gerar o relatório em PDF com os dados do período
  E disponibilizar o arquivo para download

Cenário: Gerar relatório em CSV
  Dado que estou autenticado como Gestor Ambiental
  E que existem dados de consumo e destinação no período selecionado
  Quando eu solicitar a geração do relatório de conformidade no formato CSV
  Então o sistema deve gerar o arquivo CSV com os registros do período
  E disponibilizar o arquivo para download
```

---

## História de Usuário 10 — Visualizar dashboards de KPIs ambientais
> Referência: **R10** (Prioridade: Média — depende de R04, R05 e R06)

**Como um** membro da Diretoria,
**eu gostaria de** visualizar dashboards com KPIs atualizados (ex.: % de reuso, água economizada, resíduos destinados corretamente),
**para** acompanhar os resultados ambientais da empresa e apoiar a prestação de contas.

### Testes de Aceitação

```gherkin
Funcionalidade: Visualizar dashboards de KPIs ambientais

Cenário: Exibir KPIs atualizados no dashboard
  Dado que estou autenticado como Diretoria
  E que existem dados de consumo e de destinação de resíduos registrados
  Quando eu acessar o dashboard de indicadores ambientais
  Então o sistema deve exibir os KPIs de % de reuso, água economizada e resíduos destinados corretamente
  E os valores devem refletir os dados mais recentes do sistema

Cenário: Filtrar dashboard por período
  Dado que estou autenticado como Diretoria
  E que estou visualizando o dashboard de indicadores ambientais
  Quando eu aplicar o filtro de período "último trimestre"
  Então o sistema deve recalcular os KPIs considerando apenas os dados desse período
```

---

## Rastreabilidade — Histórias x Requisitos Funcionais

| História | Requisito | Perfil | Prioridade |
|----------|-----------|--------|------------|
| HU01 | R01 | Administrador | Média |
| HU02 | R04 | Operador | Alta |
| HU03 | R05 | Operador | Alta |
| HU04 | R03 | Gestor Ambiental | Média |
| HU05 | R02 | Gestor Ambiental | Média |
| HU06 | R07 | Gestor Ambiental | Alta |
| HU07 | R06 | Gestor Ambiental | Alta |
| HU08 | R08 | Gestor Ambiental | Baixa |
| HU09 | R09 | Gestor Ambiental | Alta |
| HU10 | R10 | Diretoria | Média |
