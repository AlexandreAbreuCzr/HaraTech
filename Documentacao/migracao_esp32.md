# Migração do Arduino Uno para ESP32

## Alterações de Hardware

### Sensor de Umidade

Arduino:
A0

ESP32:
GPIO 34

### Bomba

Arduino:
D8

ESP32:
GPIO 4

### LCD

Arduino:
RS=12 E=11 D4=5 D5=4 D6=3 D7=2

ESP32:
RS=23 E=22 D4=21 D5=19 D6=18 D7=5

---

## Alterações de Software

### Serial

Arduino:
Serial.begin(9600);

ESP32:
Serial.begin(115200);

### Limite de Umidade

Arduino:
500

ESP32:
2000

---

## Observações

O ESP32 utiliza ADC de 12 bits (0 a 4095), enquanto o Arduino Uno utiliza ADC de 10 bits (0 a 1023).

Por isso foi necessário ajustar o valor limite utilizado para acionamento da bomba.
