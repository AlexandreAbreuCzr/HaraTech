# Hara Tech API

API REST inicial da Hara Tech, uma plataforma de irrigacao inteligente baseada em ESP32.

O backend permite cadastro/login de usuarios, registro automatico de dispositivos, vinculacao de dispositivos a usuarios, heartbeat para monitoramento online e criacao de areas/hortas como zonas de irrigacao.

## Stack

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT
- bcrypt
- dotenv
- Zod

## Estrutura

```txt
hara-tech-api/
|-- prisma/
|   `-- schema.prisma
|-- src/
|   |-- controllers/
|   |   |-- auth.controller.ts
|   |   |-- device.controller.ts
|   |   `-- zone.controller.ts
|   |-- lib/
|   |   `-- prisma.ts
|   |-- middlewares/
|   |   |-- authenticate.ts
|   |   |-- deviceAuth.ts
|   |   `-- errorHandler.ts
|   |-- routes/
|   |   |-- auth.routes.ts
|   |   `-- device.routes.ts
|   |-- services/
|   |   |-- auth.service.ts
|   |   |-- device.service.ts
|   |   `-- zone.service.ts
|   |-- utils/
|   |   |-- AppError.ts
|   |   |-- deviceId.ts
|   |   `-- jwt.ts
|   |-- app.ts
|   `-- server.ts
|-- .env.example
|-- package.json
|-- render.yaml
`-- tsconfig.json
```

## Rotas

A API expoe as rotas principais com prefixo versionado `/api/v1`:

```cpp
String API_URL = "http://API/api/v1";
```

Para compatibilidade, os aliases antigos em `/api` e os aliases sem `/api`
(`/auth` e `/devices`) continuam funcionando.

### Auth

#### POST `/api/v1/auth/register`

Body:

```json
{
  "name": "Alexandre",
  "email": "alex@email.com",
  "password": "123456"
}
```

Resposta:

```json
{
  "user": {
    "id": "uuid",
    "name": "Alexandre",
    "email": "alex@email.com",
    "createdAt": "2026-06-19T00:00:00.000Z"
  },
  "token": "jwt"
}
```

#### POST `/api/v1/auth/login`

Body:

```json
{
  "email": "alex@email.com",
  "password": "123456"
}
```

Resposta:

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "name": "Alexandre",
    "email": "alex@email.com",
    "createdAt": "2026-06-19T00:00:00.000Z"
  }
}
```

### Devices

#### POST `/api/v1/devices/register`

Endpoint usado pelo ESP32. Nao exige JWT de usuario, mas exige o segredo de
provisionamento do dispositivo.

Header:

```txt
X-Provisioning-Secret: <DEVICE_PROVISIONING_SECRET>
```

Body enviado pelo firmware:

```json
{
  "chipId": "ABC123"
}
```

Se o `chipId` nao existir, a API cria um `deviceId` aleatorio no formato
`HT-XXXXXX`, gera um `deviceToken`, salva apenas o hash no banco e devolve o
token para o ESP32 armazenar localmente. Se o device ja existir e ainda nao tiver
token, a API cria um token. Se ja tiver token, retorna somente o `deviceId`.

Para recuperar um device que perdeu o token, envie `rotateToken: true` junto com
o segredo de provisionamento. A resposta usa HTTP 200 porque o sketch atual trata
qualquer status diferente de 200 como erro.

Resposta:

```json
{
  "deviceId": "HT-4B7X92",
  "deviceToken": "token-gerado-apenas-no-provisionamento"
}
```

#### POST `/api/v1/devices/link`

Endpoint usado pelo app/web do usuario. Exige JWT.

Header:

```txt
Authorization: Bearer <token>
```

Body:

```json
{
  "deviceId": "HT-4B7X92"
}
```

#### GET `/api/v1/devices`

Retorna os dispositivos vinculados ao usuario autenticado.

Header:

```txt
Authorization: Bearer <token>
```

Resposta:

```json
{
  "devices": [
    {
      "id": "uuid",
      "deviceId": "HT-4B7X92",
      "chipId": "ABC123",
      "name": null,
      "isLinked": true,
      "lastSeen": "2026-06-19T00:00:00.000Z",
      "lastIp": "192.168.0.20",
      "lastRssi": -50,
      "createdAt": "2026-06-19T00:00:00.000Z",
      "isOnline": true
    }
  ],
  "total": 1
}
```

#### POST `/api/v1/devices/:deviceId/heartbeat`

Endpoint usado pelo ESP32. Nao exige JWT de usuario, mas exige o token proprio
do dispositivo.

Header:

```txt
X-Device-Token: <deviceToken>
```

Body enviado pelo firmware:

```json
{
  "ip": "192.168.0.20",
  "rssi": -50
}
```

Atualiza `lastSeen`.

Resposta:

```json
{
  "deviceId": "HT-4B7X92",
  "lastSeen": "2026-06-19T00:00:00.000Z",
  "lastIp": "192.168.0.20",
  "lastRssi": -50,
  "isOnline": true
}
```

### Areas / Hortas

Uma area ou horta e tratada como uma `Zone` do dispositivo. Exemplos: `Horta alface`, `Canteiro 1`, `Estufa`, `Jardim frontal`.

Todas as rotas abaixo exigem JWT e so funcionam se o dispositivo estiver vinculado ao usuario autenticado.

Header:

```txt
Authorization: Bearer <token>
```

#### POST `/api/v1/devices/:deviceId/zones`

Cria uma area/horta no dispositivo.

Body:

```json
{
  "name": "Horta alface",
  "index": 0
}
```

O campo `index` representa a saida fisica/zona do ESP32. Se nao enviar `index`, a API escolhe o proximo indice disponivel.

Resposta:

```json
{
  "id": "uuid",
  "name": "Horta alface",
  "index": 0,
  "isActive": false,
  "createdAt": "2026-06-19T00:00:00.000Z"
}
```

#### GET `/api/v1/devices/:deviceId/zones`

Lista as areas/hortas do dispositivo.

Resposta:

```json
{
  "zones": [
    {
      "id": "uuid",
      "name": "Horta alface",
      "index": 0,
      "isActive": false,
      "createdAt": "2026-06-19T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### PATCH `/api/v1/devices/:deviceId/zones/:zoneId`

Edita uma area/horta.

Body:

```json
{
  "name": "Horta tomate",
  "index": 1,
  "isActive": true
}
```

#### DELETE `/api/v1/devices/:deviceId/zones/:zoneId`

Remove uma area/horta do dispositivo.

## Banco de dados

O `schema.prisma` ja contem as tabelas principais:

- `users`: `id`, `name`, `email`, `passwordHash`, `createdAt`
- `devices`: `id`, `deviceId`, `chipId`, `deviceTokenHash`, `name`, `isLinked`, `ownerId`, `lastSeen`, `lastIp`, `lastRssi`, `createdAt`
- `zones`: areas/hortas ou zonas fisicas do dispositivo

Tambem ja deixa a arquitetura preparada para:

- `sensors`
- `sensor_readings`
- `irrigation_logs`

## Executar localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edite `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/haratech?schema=public"
JWT_SECRET="troque-por-um-segredo-forte-com-pelo-menos-32-caracteres"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
DEVICE_PROVISIONING_SECRET="troque-por-um-segredo-de-provisionamento-forte"
DEVICE_ONLINE_WINDOW_SECONDS=120
```

### 3. Criar/aplicar schema no banco

Para desenvolvimento rapido:

```bash
npm run db:push
```

Para trabalhar com migrations:

```bash
npm run db:migrate -- --name init
```

### 4. Rodar a API

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

## Teste rapido com PowerShell

Crie ou faca login:

```powershell
$user = Invoke-RestMethod -Method POST http://localhost:3000/api/v1/auth/register `
  -ContentType "application/json" `
  -Body '{"name":"Alexandre","email":"alex@email.com","password":"123456"}'

$token = $user.token
```

Registre um dispositivo fake:

```powershell
$deviceSecret = "troque-por-um-segredo-de-provisionamento-forte"

$device = Invoke-RestMethod -Method POST http://localhost:3000/api/v1/devices/register `
  -Headers @{ "X-Provisioning-Secret" = $deviceSecret } `
  -ContentType "application/json" `
  -Body '{"chipId":"ABC123"}'

$deviceId = $device.deviceId
$deviceToken = $device.deviceToken
```

Vincule o dispositivo ao usuario:

```powershell
Invoke-RestMethod -Method POST http://localhost:3000/api/v1/devices/link `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body "{`"deviceId`":`"$deviceId`"}"
```

Crie uma area/horta:

```powershell
$zone = Invoke-RestMethod -Method POST "http://localhost:3000/api/v1/devices/$deviceId/zones" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"name":"Horta alface","index":0}'
```

Liste as areas/hortas:

```powershell
Invoke-RestMethod -Method GET "http://localhost:3000/api/v1/devices/$deviceId/zones" `
  -Headers @{ Authorization = "Bearer $token" }
```

## Configuracao do ESP32

Em deploy local, o ESP32 nao consegue acessar `localhost` do seu computador. Use o IP da maquina na mesma rede Wi-Fi:

```cpp
String API_URL = "http://192.168.0.10:3000/api/v1";
```

No Render, use a URL publica:

```cpp
String API_URL = "https://hara-tech-api.onrender.com/api/v1";
```

## Deploy gratuito no Render

O projeto inclui `render.yaml`, entao voce pode usar Blueprint no Render.

### Opcao A: Blueprint

1. Envie este projeto para um repositorio GitHub.
2. No Render, clique em **New +** e escolha **Blueprint**.
3. Selecione o repositorio.
4. O Render vai ler `render.yaml` e criar:
   - Web Service `hara-tech-api`
   - PostgreSQL `hara-tech-db`
5. Apos o deploy, teste:

```bash
curl https://SEU-SERVICO.onrender.com/api/v1/health
```

### Opcao B: Manual

1. Crie um PostgreSQL no Render com plano Free.
2. Crie um Web Service Node.
3. Configure:
   - Build Command: `npm install && npm run db:generate && npm run build`
   - Pre-Deploy Command: `npm run db:push`
   - Start Command: `npm start`
   - Health Check Path: `/api/v1/health`
4. Variaveis de ambiente:

```txt
DATABASE_URL=<connectionString do PostgreSQL Render>
JWT_SECRET=<segredo forte gerado por voce>
JWT_EXPIRES_IN=7d
NODE_ENV=production
DEVICE_PROVISIONING_SECRET=<segredo forte compartilhado com o firmware>
DEVICE_ONLINE_WINDOW_SECONDS=120
```

### Observacoes do plano Free

De acordo com a documentacao atual do Render:

- Web Services Free entram em sleep apos 15 minutos sem trafego e acordam na proxima requisicao.
- Render Postgres Free tem limite de 1 GB.
- Render Postgres Free expira 30 dias apos a criacao.
- O plano Free e bom para prototipo e teste, nao para producao.

Referencias oficiais:

- https://render.com/docs/free
- https://render.com/docs/your-first-deploy
- https://render.com/docs/deploy-prisma-orm
