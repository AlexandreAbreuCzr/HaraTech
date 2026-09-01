# 💧 Hara - Irrigação Inteligente

Sistema IoT para irrigação automatizada com ESP32, API REST e dashboard web.

## Repositório

```
/
├── esp32codes/          # Firmware do Dispositivo Hara (ESP32)
│   └── initial/
│       └── initial.ino
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
- Leitura independente dos três sensores de umidade, um por área
- Três saídas físicas fixas, cada uma com sensor e servo do registro
- Controle suave e progressivo dos três servos (PWM)
- Confirmação de comando somente após o servo atingir o ângulo solicitado
- Validação da pinagem oficial e compatibilidade com Arduino-ESP32 2.x/3.x
- Sincronização remota de configuração
- Execução de comandos remotos
- Busca de comandos a cada 2 segundos para resposta rápida da bomba e dos registros
- Telemetria a cada 5 segundos e sincronização de configuração a cada 10 segundos
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
Abra `esp32codes/initial/initial.ino` na Arduino IDE, selecione a placa **NodeMCU-32S**, configure `API_URL` e `PROVISIONING_SECRET`, compile e envie para o ESP32.

Bibliotecas necessárias:

- ESP32 by Espressif Systems 3.x (o firmware também possui compatibilidade com 2.x)
- ArduinoJson 7.x
- WiFiManager 2.0.17 ou compatível
- LiquidCrystal

No painel não se informa GPIO. Escolha somente a saída gravada na caixa:

| Saída | Servo | Sensor AO |
|---:|---:|---:|
| 1 | GPIO 13 | GPIO 34 |
| 2 | GPIO 14 | GPIO 35 |
| 3 | GPIO 25 | GPIO 32 |

Cada saída pode pertencer a uma única área. Saídas sem área permanecem sem comando PWM e fora da telemetria por área.

## Montagem do Hardware
Veja o guia completo em [`circuito.md`](circuito.md).

## Stack
- **Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, JWT, Zod
- **Firmware:** Arduino Framework (C++), WiFiManager, ArduinoJson, LiquidCrystal
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Hardware:** ESP32, três sensores de umidade, bomba d'água, três servos de registro, LCD 16x2
