# 💧 Hara - Irrigação Inteligente

Sistema IoT para irrigação automatizada com ESP32, API REST e dashboard web.

## Repositório

```
/
├── esp32codes/          # Firmware do Dispositivo Hara (ESP32)
│   └── initial.ino
├── hara-tech-api/       # Backend (Node.js + TypeScript + Express + Prisma)
├── hara-tech-web/       # Frontend Web (React + Vite + Tailwind)
├── circuito.md          # Guia de montagem do hardware
├── logo.jpeg            # Logotipo
└── README.md
```

## Funcionalidades

### Backend
- Cadastro e autenticação de usuários (JWT)
- Registro automático de dispositivos ESP32
- Heartbeat com detecção online/offline
- Gerenciamento de zonas de irrigação
- Envio de comandos remotos (bomba on/off, abrir/fechar zonas, sincronizar, reiniciar)
- Recebimento e armazenamento de telemetria
- Rate limiting, validação Zod, erros seguros

### Firmware
- WiFiManager para configuração fácil da rede
- Registro automático na API
- Heartbeat periódico com IP e RSSI
- Controle local da bomba (automático com histerese)
- Leitura de sensor de umidade do solo
- Controle de servos por zona (PWM)
- Sincronização remota de configuração
- Execução de comandos remotos
- Display LCD 16x2

### Frontend
- Dashboard com visão geral do sistema
- Gerenciamento de dispositivos
- Controle de zonas e bomba
- Comandos remotos em tempo real
- Cadastro de culturas com necessidades de água
- Programação de regas automáticas
- Histórico de irrigação
- Tema escuro (azul, preto e branco)

## Como Rodar

### Backend
```bash
cd hara-tech-api
npx prisma migrate deploy
npx prisma generate
npx tsx src/server.ts
```

### Frontend
```bash
cd hara-tech-web
npm run dev
```

### Firmware
Abra `esp32codes/initial.ino` na Arduino IDE, configure `API_URL` e `PROVISIONING_SECRET`, compile e envie para o ESP32.

## Montagem do Hardware
Veja o guia completo em [`circuito.md`](circuito.md).

## Stack
- **Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, JWT, Zod
- **Firmware:** Arduino Framework (C++), WiFiManager, ArduinoJson, LiquidCrystal
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Hardware:** ESP32, sensor de umidade, bomba d'água, servos, LCD 16x2
