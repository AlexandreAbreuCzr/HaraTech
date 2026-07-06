# Montagem do Circuito - Dispositivo Hara

## Componentes Necessários

| Quantidade | Componente | Especificação |
|-----------|-----------|--------------|
| 1 | ESP32 | NodeMCU-32S ou similar |
| 1 | Sensor de umidade do solo | Higrômetro (YL-69 ou similar) |
| 1 | Bomba d'água | 5V/12V (com relé) |
| 1 | Módulo relé | 1 canal 5V (para bomba) |
| 1 | Servo motor | MG996R (2kg) ou similar |
| 1 | Display LCD | 16x2 com interface paralela |
| 1 | Fonte de alimentação | 5V para ESP32 + bomba |
| 1 | Protoboard | 830 pontos |
| Vários | Jumpers | Macho-macho e macho-fêmea |
| 1 | Mangueira flexível | Para conexão da bomba às zonas |
| 1 | Válvula ou pinçamento | Mangueira comprimida pelo servo |

---

## Pinagem ESP32

```
LCD 16x2:
  RS  → GPIO 23
  E   → GPIO 22
  D4  → GPIO 21
  D5  → GPIO 19
  D6  → GPIO 18
  D7  → GPIO 5
  VCC → 5V
  GND → GND

Sensor de Umidade:
  AO  → GPIO 34 (ADC)
  VCC → 3.3V
  GND → GND

Módulo Relé (Bomba):
  IN  → GPIO 26
  VCC → 5V
  GND → GND

Servo Motor (Zona 1):
  Sinal → GPIO 13 (PWM)
  VCC   → 5V
  GND   → GND

Servo Motor (Zona 2):
  Sinal → GPIO 12 (PWM)
  VCC   → 5V
  GND   → GND
```

> Se usar mais zonas, adicione servos em GPIOs 14, 27, 33, etc.

---

## Diagrama de Ligação

```
             ┌───────────────────┐
             │       ESP32       │
             │                   │
   Umidade──▶│ GPIO 34 (ADC)     │
             │                   │
   LCD RS───▶│ GPIO 23           │
   LCD E────▶│ GPIO 22           │
   LCD D4───▶│ GPIO 21           │
   LCD D5───▶│ GPIO 19           │
   LCD D6───▶│ GPIO 18           │
   LCD D7───▶│ GPIO 5            │
             │                   │
   Relé─────▶│ GPIO 26           │
   Bomba ◀───┤ (contato relé)    │
             │                   │
   Servo 1──▶│ GPIO 13 (PWM)     │
   Servo 2──▶│ GPIO 12 (PWM)     │
             └───────────────────┘
```

---

## Sistema Hidráulico

```
                 ┌─────────┐
                 │  Bomba  │
                 │   d'água│
                 └────┬────┘
                      │
            ┌─────────┼─────────┐
            │         │         │
            ▼         ▼         ▼
       ┌────────┐ ┌────────┐ ┌────────┐
       │ Servo 1│ │ Servo 2│ │ Servo 3│
       │ Zona 1 │ │ Zona 2 │ │ Zona 3 │
       └───┬────┘ └───┬────┘ └───┬────┘
           │          │          │
           ▼          ▼          ▼
        Mangueira  Mangueira  Mangueira
```

Cada servo comprime fisicamente a mangueira para fechar o fluxo, e libera para abrir.

---

## Passo a Passo da Montagem

### 1. Alimentação
- Conecte o ESP32 ao computador via USB para programação
- Para operação standalone, use fonte 5V com capacidade suficiente para ESP32 + servos + bomba

### 2. Display LCD
- Conecte os pinos conforme tabela acima
- O display funciona em 5V (VCC no 5V do ESP32)
- Ajuste o contraste pelo potenciômetro do LCD

### 3. Sensor de Umidade
- Conecte o pino AO ao GPIO 34
- O sensor é analógico, retorna valores entre 0 (seco) e 4095 (molhado)
- A calibração é feita no firmware: `SOIL_RAW_DRY = 4095`, `SOIL_RAW_WET = 1200`

### 4. Relé e Bomba
- O módulo relé é ativado por sinal HIGH no GPIO 26 (configurável em `PUMP_ACTIVE_HIGH`)
- A bomba deve ser ligada aos contatos NA (normalmente aberto) do relé
- ATENÇÃO: se a bomba for 12V, use fonte separada e não ligue direto no ESP32

### 5. Servos (Zonas)
- Cada servo representa uma zona de irrigação
- Configure no backend: `channel` (GPIO), `openAngle`, `closedAngle`, etc.
- Para mais zonas, adicione servos em GPIOs PWM disponíveis

### 6. Teste Inicial
1. Alimente o ESP32
2. Conecte ao WiFi `HARA_SETUP` (portal do WiFiManager)
3. Configure a rede Wi-Fi da sua casa
4. O dispositivo se registrará automaticamente na API
5. Verifique o deviceId no display ou serial

---

## Configuração do Firmware

Antes de compilar, edite `esp32codes/initial.ino`:

```cpp
const char* API_URL = "http://192.168.1.100:3000/api/v1";
const char* PROVISIONING_SECRET = "seu-segredo-aqui";
```

- `API_URL`: endereço do servidor backend na rede local
- `PROVISIONING_SECRET`: mesma string do `DEVICE_PROVISIONING_SECRET` no `.env`

---

## Especificações Técnicas

- **Tensão:** 5V DC
- **Consumo:** ~500mA (sem bomba), ~2A (com bomba)
- **Wi-Fi:** 802.11 b/g/n (2.4GHz)
- **Display:** LCD 16x2, caracteres brancos em fundo azul
- **Zonas suportadas:** 1 a 16 (configurável)
- **Tipo de atuador:** Servo motor PWM (ou PCA9685 para muitas zonas)

---

## Precauções

- Não ligue a bomba diretamente ao GPIO do ESP32 — sempre use o módulo relé
- Se usar servos 5V com alto torque, alimente-os com fonte externa (não pelo regulador do ESP32)
- Mantenha o sensor de umidade limpo para leituras precisas
- O servo pode aquecer se mantido pressionando a mangueira por muito tempo
- Para muitas zonas (>4), considere usar driver PCA9685 para não sobrecarregar o ESP32
