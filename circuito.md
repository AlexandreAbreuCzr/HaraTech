# Montagem elétrica e pinagem — Hara Tech

Este guia corresponde ao firmware `esp32codes/initial/initial.ino` e à caixa Hara Tech com **três saídas físicas fixas**. No painel o usuário escolhe somente **Saída 1, Saída 2 ou Saída 3**; os GPIOs não são informados nem alterados.

Cada saída pertence a uma área de irrigação e reúne as conexões de alimentação e comunicação de:

- um sensor de umidade do solo;
- um servo que abre e fecha o registro/válvula daquela área.

Uma saída que ainda não foi associada a uma área fica sem PWM de servo e é ignorada pelo controle e pela telemetria. A alimentação física do conector continua presente; “desativada” significa que o firmware não comanda essa saída.

## 1. Componentes

| Quantidade | Componente | Observação |
|---:|---|---|
| 1 | ESP32 NodeMCU-32S | Módulo ESP-WROOM-32 ou pinagem equivalente |
| 1 | LCD 16x2 paralelo | Controlador HD44780, sem adaptador I2C |
| 3 | Sensores capacitivos de umidade | Um por área; saída analógica de no máximo 3,3 V |
| 3 | Servos | Um por área, dimensionado para abrir/fechar o registro |
| 1 | Módulo relé de 1 canal | Entrada compatível com 3,3 V; montagem atual ativa em HIGH |
| 1 | Bomba DC | Tensão e corrente conforme a fonte e o relé |
| 1 | Fonte regulada para os servos | 5 a 6 V, dimensionada para a corrente de partida/travamento dos três servos |
| 1 | Fonte da bomba | Conforme a bomba usada |
| 1 | Capacitor eletrolítico | 470 µF a 1000 µF próximo à distribuição dos servos |
| Diversos | Bornes, conectores, mangueiras e registros | Use bitola adequada para bomba e servos |

> Não alimente a bomba nem os servos pelo pino 5V do ESP32 ou pela USB. Picos de corrente causam reinicializações, movimento irregular e podem danificar a placa. Todos os GNDs de controle devem estar interligados.

## 2. As três saídas da caixa

Esta é a pinagem interna definitiva. Ela também é validada pelo firmware, pela API e pelo painel.

| Saída gravada na caixa | Área lógica | Sinal do servo | Sinal AO do sensor | Alimentação do servo | Alimentação do sensor |
|---:|---:|---:|---:|---|---|
| Saída 1 | índice 0 | GPIO 13 | GPIO 34 | fonte externa 5–6 V | 3V3 do ESP32 |
| Saída 2 | índice 1 | GPIO 14 | GPIO 35 | fonte externa 5–6 V | 3V3 do ESP32 |
| Saída 3 | índice 2 | GPIO 25 | GPIO 36 | fonte externa 5–6 V | 3V3 do ESP32 |

Cada conector deve disponibilizar funcionalmente:

- positivo 5–6 V do servo;
- sinal PWM do servo;
- 3,3 V do sensor;
- sinal analógico AO do sensor;
- GND comum para sensor, servo, fonte externa e ESP32.

A ordem física desses contatos deve seguir a gravação/etiqueta da própria caixa. Não troque 5–6 V do servo com 3,3 V do sensor.

## 3. Demais GPIOs do ESP32

| Função | GPIO | Direção |
|---|---:|---|
| LCD RS | 23 | Saída |
| LCD E | 22 | Saída |
| LCD D4 | 21 | Saída |
| LCD D5 | 19 | Saída |
| LCD D6 | 18 | Saída |
| LCD D7 | 5 | Saída |
| Relé da bomba IN | 26 | Saída |

Não use GPIO 6 a 11, pois são ligados à memória flash. Evite GPIO 0, 2, 4, 12 e 15 em periféricos que alterem seus níveis durante a inicialização. GPIO 34, 35 e 36 são somente entradas e, nesta montagem, recebem os sensores.

## 4. Ligações por componente

### LCD 16x2 em modo de 4 bits

| Pino do LCD | Ligação |
|---|---|
| 1 — VSS | GND |
| 2 — VDD | 5 V |
| 3 — VO | Terminal central do potenciômetro de 10 kΩ |
| 4 — RS | GPIO 23 |
| 5 — RW | GND |
| 6 — E | GPIO 22 |
| 7 a 10 — D0 a D3 | Sem ligação |
| 11 — D4 | GPIO 21 |
| 12 — D5 | GPIO 19 |
| 13 — D6 | GPIO 18 |
| 14 — D7 | GPIO 5 |
| 15 — A/LED+ | 5 V, com resistor se necessário |
| 16 — K/LED− | GND |

Ligue uma extremidade do potenciômetro ao 5 V, a outra ao GND e o terminal central ao VO.

### Sensores de umidade

Em cada saída:

| Pino do sensor | Ligação |
|---|---|
| VCC | 3V3 do ESP32 |
| GND | GND comum |
| AO | GPIO 34, 35 ou 36, conforme Saída 1, 2 ou 3 |
| DO | Sem ligação |

O AO nunca pode exceder 3,3 V. O firmware usa ADC de 12 bits e parte destes valores:

```cpp
const int SOIL_RAW_DRY = 4095;
const int SOIL_RAW_WET = 1200;
```

Calibre os valores com os sensores realmente instalados. Cada área envia sua própria leitura de umidade.

### Servos e registros

Em cada saída:

| Fio típico do servo | Ligação |
|---|---|
| Marrom/preto — GND | Negativo da fonte externa e GND comum |
| Vermelho — VCC | Fonte externa regulada de 5 a 6 V |
| Laranja/amarelo — sinal | GPIO 13, 14 ou 25, conforme Saída 1, 2 ou 3 |

Instale o capacitor de 470 µF a 1000 µF perto da distribuição dos servos. O servo deve movimentar o registro sem permanecer forçando contra o batente mecânico.

### Relé e bomba

Lado de controle:

| Pino do relé | Ligação |
|---|---|
| IN | GPIO 26 |
| VCC | Tensão exigida pelo módulo, normalmente 5 V |
| GND | GND comum com o ESP32 |

A montagem atual usa relé ativo em nível alto:

```cpp
const bool PUMP_ACTIVE_HIGH = true;
```

Instale um resistor de **10 kΩ entre GPIO 26/IN e GND** para manter o relé desligado antes de o firmware assumir o controle. Se o módulo for ativo em LOW, altere a constante para `false`.

Lado de potência, com bomba normalmente desligada:

```text
positivo da fonte da bomba ── COM do relé
NO do relé ────────────────── positivo da bomba
negativo da bomba ─────────── negativo da fonte da bomba
```

Nunca ligue a bomba diretamente ao GPIO. Use proteção adequada para a carga indutiva.

## 5. Diagrama elétrico funcional

```text
                         HARA TECH — ESP32
                    ┌────────────────────────┐
Saída 1 sensor AO ─▶│ GPIO 34                │
Saída 1 servo PWM ◀─│ GPIO 13                │
Saída 2 sensor AO ─▶│ GPIO 35                │
Saída 2 servo PWM ◀─│ GPIO 14                │
Saída 3 sensor AO ─▶│ GPIO 36                │
Saída 3 servo PWM ◀─│ GPIO 25                │
relé IN ◀───────────│ GPIO 26                │
LCD RS/E/D4..D7 ◀───│ 23,22,21,19,18,5      │
GND comum ──────────│ GND                    │
                    └────────────────────────┘

fonte 5–6 V ─── VCC dos três servos
fonte GND ────── GND dos servos ── ESP32 GND ── sensores GND ── relé GND
ESP32 3V3 ────── VCC dos três sensores
```

## 6. Distribuição hidráulica por área

```text
reservatório → bomba → distribuidor
                         ├─ registro + servo da Saída 1 → Área 1
                         ├─ registro + servo da Saída 2 → Área 2
                         └─ registro + servo da Saída 3 → Área 3
```

No modo automático, cada sensor decide somente o estado do registro da própria área. A bomba liga apenas depois que ao menos um registro configurado terminou de abrir, e desliga quando nenhum registro precisa permanecer aberto.

## 7. Configuração no painel

1. Abra o dispositivo e clique em **Nova área**.
2. Dê um nome à área.
3. Escolha **Saída 1**, **Saída 2** ou **Saída 3**, igual ao número gravado na caixa.
4. Ajuste os ângulos aberto e fechado e, se necessário, inverta o sentido.
5. Teste o movimento sem ligar a bomba e sem forçar o servo no final do curso.

Não existe campo de GPIO. Uma saída só pode pertencer a uma área, e o painel não permite criar mais de três áreas. Para desativar uma saída, remova sua área; o firmware deixa de gerar PWM e de usar seu sensor.

O movimento é progressivo, com passo padrão de 1° a cada 20 ms. Um comando só é confirmado depois que o servo chega ao ângulo solicitado ou ocorre timeout.

## 8. Gravação do firmware

No Arduino IDE, instale:

- placa `esp32 by Espressif Systems` 3.x;
- `ArduinoJson` 7.x;
- `WiFiManager` 2.0.17 ou compatível;
- `LiquidCrystal`.

Abra `esp32codes/initial/initial.ino`, selecione **NodeMCU-32S**, configure `API_URL` e `PROVISIONING_SECRET`, compile e grave.

O segredo precisa ser o mesmo `DEVICE_PROVISIONING_SECRET` do backend. Não publique firmware contendo o segredo de produção.

## 9. Sequência segura de teste

1. Faça as ligações com todas as fontes desligadas.
2. Confira o GND comum e a tensão correta de cada contato da caixa.
3. Ligue somente o ESP32 por USB, sem alimentar bomba e servos.
4. Configure o Wi‑Fi de 2,4 GHz pela rede `HARA_SETUP`.
5. Crie uma área na Saída 1 e confira a leitura do sensor correspondente.
6. Alimente os servos e teste abrir/fechar o registro, ainda sem a bomba.
7. Repita nas Saídas 2 e 3.
8. Alimente a bomba e teste uma área por vez.
9. Calibre os valores seco/molhado dos sensores no firmware.

## 10. Diagnóstico rápido

| Sintoma | Verificação |
|---|---|
| ESP32 reinicia quando o servo move | Fonte dos servos insuficiente, GND comum ausente ou capacitor faltando |
| Servo vibra | Fonte instável, sinal longo/ruidoso ou ângulo no batente |
| Bomba liga ao iniciar | Tipo do relé incompatível com `PUMP_ACTIVE_HIGH` ou pull-down de 10 kΩ ausente |
| Bomba não liga | Confirme GPIO 26, relé ativo em HIGH, registro aberto e contato COM/NO |
| Umidade sempre em 0% ou 100% | Calibração incorreta, AO trocado ou tensão acima de 3,3 V |
| Área responde na saída errada | Confira a correspondência fixa 1→13/34, 2→14/35 e 3→25/36 |
| LCD acende sem texto | Contraste VO, RW sem GND ou ordem D4–D7 incorreta |
| ESP32 não inicia | Remova ligações indevidas dos pinos de boot, especialmente GPIO 12 |
