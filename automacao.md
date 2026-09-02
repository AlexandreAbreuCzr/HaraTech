# Rega automática por área — Hara Tech

A automação é executada localmente pelo ESP32 e cada área possui parâmetros próprios. A tela **Programação** continua separada: futuramente ela poderá autorizar dias e horários, mas não substitui as proteções locais descritas aqui.

## Configurações de cada área

| Campo | Função | Padrão |
|---|---|---:|
| Ativar rega automática | Habilita a decisão local pelo sensor daquela área | Sim |
| Iniciar abaixo de | Umidade que inicia a confirmação de solo seco | 35% |
| Encerrar em | Umidade alvo para finalizar o ciclo | 40% |
| Confirmar solo seco por | Evita iniciar por uma leitura isolada ou ruído | 10 s |
| Tempo mínimo | Impede encerrar antes de a água começar a penetrar no solo | 15 s |
| Tempo máximo | Proteção contra sensor mal posicionado, vazamento ou solo que não responde | 300 s |
| Intervalo mínimo | Evita ciclos repetidos e dá tempo para a água se distribuir | 30 min |

O ponto de encerramento deve ser maior que o ponto de início. Essa diferença é a histerese da área e impede que a válvula fique abrindo e fechando perto de um único limite.

## Sequência executada no ESP32

1. Lê e filtra o sensor correspondente à saída da área.
2. Se o sensor estiver desconectado ou inválido, não inicia a automação.
3. Se a umidade ficar abaixo do limite inicial durante todo o tempo de confirmação, verifica o intervalo mínimo.
4. Abre somente o registro daquela área.
5. Liga a bomba apenas depois que o servo terminar o comando de abertura.
6. Mantém a rega pelo tempo mínimo configurado.
7. Encerra ao alcançar a umidade alvo ou obrigatoriamente ao chegar ao tempo máximo.
8. Fecha o registro, desliga a bomba quando não houver outra área aberta e inicia o intervalo de espera.

## Regras de segurança

- Área sem sensor válido nunca inicia rega automática.
- Perda do sensor durante um ciclo encerra aquela rega.
- Desativar a automação durante um ciclo também encerra e fecha a área.
- O tempo máximo sempre prevalece, mesmo que a umidade não aumente.
- Uma rega manual assume temporariamente a área e não é interrompida pela decisão automática.
- Ao encerrar manualmente, o intervalo mínimo começa a contar para impedir reabertura automática imediata.
- `PUMP_OFF` manual é mantido durante a sequência de fechamento do servo.

## Integração futura com planejamento

O planejamento deverá responder **quando uma área pode regar**; esta automação continuará decidindo **se ela precisa regar e quando deve parar**. Assim, uma agenda futura poderá criar janelas, dias e prioridades sem duplicar limites de sensor ou remover as proteções locais.

Exemplo: o planejamento libera a Área 2 entre 06:00 e 08:00. Dentro dessa janela, o ESP32 só inicia se a umidade permanecer abaixo do limite configurado e ainda respeita tempo máximo e intervalo mínimo.
