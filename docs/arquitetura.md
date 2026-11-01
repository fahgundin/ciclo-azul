# Arquitetura — Ciclo Azul (ODS 6)

> Documento de arquitetura técnica. Define stack, estilo arquitetural,
> organização de camadas, comunicação em tempo real, integração IoT e segurança.
> Decisões registradas em `docs/decisoes/`.

## 1. Stack tecnológica

| Camada | Tecnologia | Observações |
|---|---|---|
| Backend | **NestJS** (TypeScript) | Arquitetura limpa + hexagonal (ports & adapters). |
| Frontend | **React** (TypeScript), **PWA** | Camadas desacopladas para troca de componentes e futura migração para React Native. |
| Banco de dados | **PostgreSQL** (sugerido) | Relacional, bom para séries de leituras e dados de conformidade. A confirmar. |
| Mensageria IoT | **MQTT** (broker Mosquitto/EMQX via Docker) | Canal de ingestão das leituras dos sensores. |
| Mock de sensores | **Python** | Projeto separado; publisher MQTT que simula sensores reais. |
| Tempo real (backend → front) | **WebSocket** (ou SSE) | Entrega de leituras ao painel de monitoramento. |
| Autenticação / Autorização | **Keycloak** (OIDC) | RBAC para os 4 perfis; auth obrigatória em todas as rotas. |
| Orquestração dev | **Docker Compose** | Sobe backend, banco, broker MQTT e Keycloak localmente. |

## 2. Estilo arquitetural

Adotamos **Arquitetura Limpa + Hexagonal (Ports & Adapters)** no backend.

Princípio central: **o domínio não conhece framework, banco, broker ou protocolo.**
As dependências apontam sempre para dentro (regra da dependência): infraestrutura
depende de aplicação, que depende do domínio — nunca o contrário.

```
            ┌─────────────────────────────────────────────┐
            │                  Domínio                     │
            │   Entidades, Value Objects, Regras de        │
            │   negócio, Ports (interfaces)                │
            └─────────────────────────────────────────────┘
                         ▲                   ▲
                         │ usa ports         │ usa ports
            ┌─────────────────────────────────────────────┐
            │                 Aplicação                    │
            │   Casos de uso (orquestração), DTOs          │
            └─────────────────────────────────────────────┘
                         ▲                   ▲
          implementa ports│                 │chama casos de uso
            ┌───────────────────────┐ ┌───────────────────────┐
            │  Adapters de saída     │ │  Adapters de entrada   │
            │  (driven)              │ │  (driving)             │
            │  - Repositório Postgres│ │  - Controllers HTTP    │
            │  - Subscriber MQTT     │ │  - Gateway WebSocket   │
            │  - Cliente Keycloak    │ │  - Subscriber MQTT*    │
            │  - Geração PDF/CSV     │ │                        │
            └───────────────────────┘ └───────────────────────┘
```

\* O MQTT aparece como adapter de **entrada** (recebe leituras dos sensores) e a
persistência como adapter de **saída**. O importante é que o caso de uso
"registrar leitura" não sabe se a leitura veio de MQTT, de HTTP (leitura manual)
ou de um teste.

### Por que este estilo aqui

- **Troca do mock por sensores reais sem tocar no domínio:** a ingestão é um port;
  o mock Python e os sensores reais são apenas produtores do mesmo contrato MQTT.
- **Testabilidade:** regras de negócio testadas sem banco nem broker.
- **Evolução:** trocar Postgres, broker ou provedor de auth = trocar adapter.

### Padrões de projeto aplicados

- **Ports & Adapters** (hexagonal) — fronteira do domínio.
- **Repository** — abstração de persistência (port `XxxRepository`).
- **Use Case / Interactor** — um serviço de aplicação por operação de negócio.
- **DTO + Mapper** — tradução entre camada externa e domínio.
- **Factory** — criação de entidades com invariantes garantidas.
- **Strategy** — p.ex. formato de relatório (PDF vs CSV) em R09.
- **Dependency Injection** — nativo do NestJS, liga ports a adapters via providers.

## 3. Estrutura de pastas do backend (NestJS)

Organização por **módulo de domínio**, cada um com suas camadas internas:

```
backend/
  src/
    modules/
      water-monitoring/        # R04, R05
        domain/                # entidades, VOs, ports (interfaces)
        application/           # casos de uso, DTOs
        infrastructure/        # adapters: repo Postgres, subscriber MQTT, ws gateway
        water-monitoring.module.ts
      waste-management/        # R06, R07
        domain/
        application/
        infrastructure/
        waste-management.module.ts
      reporting/               # R09
        domain/
        application/
        infrastructure/        # adapters PDF/CSV (Strategy)
      auth/                    # integração Keycloak (guards, RBAC)
    shared/                    # kernel comum, erros, utilitários de domínio
    main.ts
```

Regra prática: dentro de `domain/` não pode haver `import` de NestJS, de driver de
banco, de cliente MQTT nem de nada de infraestrutura.

## 4. Frontend React (PWA) desacoplado

Objetivo: isolar a **lógica** (reutilizável, inclusive num futuro React Native) da
**UI web** (específica de plataforma).

```
frontend/
  src/
    core/                      # NÃO depende de componentes web
      api/                     # cliente HTTP + tipos/contratos compartilhados
      realtime/                # cliente WebSocket (monitoramento)
      domain/                  # modelos e regras de apresentação
      hooks/                   # hooks de dados/estado (reutilizáveis)
      auth/                    # fluxo OIDC (Keycloak) desacoplado da UI
    ui/                        # específico de plataforma web
      components/
      pages/
    pwa/                       # service worker, manifest, offline
```

Diretrizes:

- Componentes de UI **consomem** hooks/serviços de `core/`, nunca o contrário.
- Nada em `core/` importa de `ui/`.
- Numa eventual migração para React Native, `core/` migra; `ui/` é reescrito.
- Tipos de contrato da API ficam preferencialmente em um ponto único compartilhado
  com o backend (p.ex. pacote de tipos / OpenAPI gerado), evitando divergência.

## 5. Comunicação em tempo real

Dois canais distintos e independentes:

1. **Sensores → Backend:** MQTT (ingestão). Ver `docs/contrato-iot.md`.
2. **Backend → Frontend:** WebSocket (ou SSE). O backend, ao processar uma leitura,
   emite atualização para os clientes inscritos no painel da unidade.

A regra **"sem dados recentes"** (15 min sem leitura → unidade sinalizada) é
aplicada no backend e refletida no estado enviado ao front.

## 6. Segurança e API de acesso interno

**Autenticação:** Keycloak via OIDC. Todas as rotas da API exigem autenticação —
não há rota pública de negócio. Guards do NestJS validam o token em cada requisição.

**Autorização (RBAC):** os 4 perfis (Administrador, Gestor Ambiental, Operador,
Diretoria) são roles no Keycloak. Cada rota declara as roles permitidas.

**API de acesso interno — o que isso significa na prática:**

A aplicação é uma SPA/PWA que roda no navegador, então as chamadas à API são
observáveis pelo cliente. "Interno" aqui significa **não expor a API como produto
a terceiros**, e é garantido por:

- **CORS restrito** à origem da aplicação web.
- **Autenticação obrigatória** em toda rota (sem chaves/portal para integradores).
- Sem documentação pública de API voltada a consumo externo.
- (Opcional, se evoluir) deploy em rede privada / atrás de gateway interno.

> Nota honesta: não é tecnicamente possível garantir que "somente o frontend"
> acesse a API, pois o código roda no cliente. O modelo acima cumpre o objetivo
> real — a API não é um produto exposto a terceiros.

## 7. Ambiente de desenvolvimento

`docker-compose` sobe o conjunto local:

- **backend** (NestJS)
- **db** (PostgreSQL)
- **mqtt** (broker Mosquitto/EMQX)
- **keycloak** (+ seu banco)
- **mock-sensors** (Python) — opcional, publicando no broker

O frontend roda em dev server apontando para o backend local.
