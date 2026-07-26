# Hara Tech API

API REST profissional da Hara Tech, uma plataforma IoT de irrigacao inteligente baseada em ESP32.

## Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT + bcrypt (autenticacao de usuarios)
- SHA-256 + timingSafeEqual (autenticacao de dispositivos)
- Zod (validacao de dados)
- Rate limiting (express-rate-limit)

## Estrutura

```
hara-tech-api/
├── prisma/
│   ├── schema.prisma          # Schema do banco (8 modelos, 11 enums)
│   └── migrations/            # Migrations versionadas
├── src/
│   ├── server.ts              # Entry point
│   ├── app.ts                 # Config Express, rotas, middlewares
│   ├── lib/
│   │   └── prisma.ts          # Singleton Prisma Client
│   ├── routes/
│   │   ├── auth.routes.ts     # POST /register, /login
│   │   └── device.routes.ts   # Todas as rotas de dispositivos
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── device.controller.ts
│   │   ├── zone.controller.ts
│   │   ├── command.controller.ts
│   │   ├── config.controller.ts
│   │   └── telemetry.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── device.service.ts
│   │   ├── zone.service.ts
│   │   ├── command.service.ts
│   │   ├── config.service.ts
│   │   └── telemetry.service.ts
│   ├── middlewares/
│   │   ├── authenticate.ts     # JWT user auth
│   │   ├── deviceAuth.ts       # Device token auth
│   │   └── errorHandler.ts     # Error handling centralizado
│   └── utils/
│       ├── AppError.ts
│       ├── jwt.ts
│       ├── deviceId.ts
│       ├── deviceAuth.ts
│       ├── deviceOwnership.ts  # Compartilhado entre services
│       └── response.ts         # Helper de resposta padrao
├── .env.example
├── package.json
├── render.yaml
└── tsconfig.json
```

## Arquitetura

```
Request → Routes → Middlewares → Controllers → Services → Prisma → PostgreSQL
                                                      ↓
                                              ResponseHelper (formato padrao)
```

### Camadas

- **Routes**: Definicao dos endpoints REST e delegacao para controllers
- **Middlewares**: Autenticacao (JWT user + device token), rate limiting, error handling
- **Controllers**: Finos - validam input com Zod, chamam services, retornam resposta padrao
- **Services**: Toda regra de negocio, validacao, acesso ao Prisma
- **Utils**: Helpers compartilhados (response, error, jwt, device auth, ownership)

### Formato de Resposta Padrao

Todas as respostas seguem o formato:

**Sucesso (2xx):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Mensagem opcional"
}
```

**Erro (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descricao do erro",
    "issues": []  // Apenas em erros de validacao (422)
  }
}
```

## Rotas da API

Prefixos: `/api/v1` (principal), `/api` (alias), `/` (alias legacy)

### Health

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/v1/health` | Health check |

### Auth

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/v1/auth/register` | - | Cadastro de usuario |
| POST | `/api/v1/auth/login` | - | Login de usuario |

### Devices (autenticacao por device token)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/v1/devices/register` | Registro ESP32 (requer X-Provisioning-Secret) |
| POST | `/api/v1/devices/:deviceId/heartbeat` | Heartbeat do dispositivo |
| GET | `/api/v1/devices/:deviceId/config` | Configuracao remota (suporte a 304) |
| POST | `/api/v1/devices/:deviceId/telemetry` | Receber telemetria |
| GET | `/api/v1/devices/:deviceId/commands/pending` | Polling de comandos pendentes |
| POST | `/api/v1/devices/:deviceId/commands/:commandId/ack` | Confirmar execucao de comando |

### Devices (autenticacao por JWT de usuario)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/v1/devices/link` | Vincular dispositivo ao usuario |
| GET | `/api/v1/devices` | Listar dispositivos do usuario |
| POST | `/api/v1/devices/:deviceId/zones` | Criar zona de irrigacao |
| GET | `/api/v1/devices/:deviceId/zones` | Listar zonas |
| PATCH | `/api/v1/devices/:deviceId/zones/:zoneId` | Atualizar zona |
| DELETE | `/api/v1/devices/:deviceId/zones/:zoneId` | Remover zona |
| GET | `/api/v1/devices/:deviceId/telemetry/latest` | Ultima telemetria |
| POST | `/api/v1/devices/:deviceId/commands` | Enviar comando |
| GET | `/api/v1/devices/:deviceId/commands` | Listar comandos |

## Banco de Dados

8 modelos principais:

- **User**: Usuarios do sistema
- **Device**: Dispositivos ESP32
- **Zone**: Zonas/areas de irrigacao
- **DeviceConfig**: Configuracao remota do dispositivo
- **ZoneActuator**: Atuadores (servo, relé)
- **DeviceTelemetry / DeviceTelemetryZone**: Dados de telemetria
- **Sensor / SensorReading**: Sensores e leituras
- **IrrigationLog**: Historico de irrigacao
- **Command**: Comandos enviados aos dispositivos

11 enums: `SensorType`, `TriggerType`, `DeviceOperationMode`, `PumpMode`,
`ZoneDesiredState`, `ZoneAppliedState`, `ZoneConfirmedState`, `ActuatorType`,
`ActuatorDriver`, `CommandType`, `CommandStatus`

## Autenticacao

Duas camadas independentes:

1. **Usuario (JWT)**: Login/register → token JWT (7 dias) → `Authorization: Bearer <token>`
2. **Dispositivo (Token)**: Provisionamento com segredo compartilhado → `deviceToken` (32 bytes random, SHA-256 hash armazenado) → `X-Device-Token`

## Seguranca

- Senhas hasheadas com bcrypt (12 rounds)
- Device tokens hasheados com SHA-256 (nunca armazenados plaintext)
- Comparacao timing-safe (timingSafeEqual)
- Rate limiting global (200 req/15min) + especifico ESP32 (60 req/min)
- Limite de corpo JSON (10kb)
- Headers de seguranca (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Validacao Zod em todas as entradas
- Erros de producao nao vazam detalhes internos

## Executar Localmente

```bash
npm install
Copy-Item .env.example .env   # Windows
# Edite .env com suas configuracoes
npm run db:push                # Criar schema no banco
npm run dev                    # Iniciar em modo dev
```

## Variaveis de Ambiente

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret para JWT | - |
| `JWT_EXPIRES_IN` | Expiracao do token | `7d` |
| `PORT` | Porta do servidor | `3000` |
| `NODE_ENV` | Ambiente | `development` |
| `DEVICE_PROVISIONING_SECRET` | Segredo para registro de devices | - |
| `DEVICE_ONLINE_WINDOW_SECONDS` | Janela online/offline | `120` |
| `COMMAND_RETRY_SECONDS` | Intervalo para reenviar comandos sem confirmação | `120` |

## Deploy no Render

O projeto inclui `render.yaml` para deploy via Blueprint. Veja detalhes em render.yaml.
