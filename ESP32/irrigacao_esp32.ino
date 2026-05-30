#include <LiquidCrystal.h>

LiquidCrystal lcd(23, 22, 21, 19, 18, 5);

const int sensorUmidade = 34;
const int bomba = 4;

int limiteUmidade = 2000;

void setup() {
  pinMode(bomba, OUTPUT);
  digitalWrite(bomba, LOW);

  Serial.begin(115200);

  lcd.begin(16, 2);
  lcd.print("Irrigador");
  delay(2000);
  lcd.clear();
}

void loop() {

  int umidade = analogRead(sensorUmidade);

  Serial.print("Umidade: ");
  Serial.println(umidade);

  lcd.setCursor(0, 0);
  lcd.print("Umidade:");
  lcd.print(umidade);
  lcd.print("    ");

  if (umidade < limiteUmidade) {

    digitalWrite(bomba, HIGH);

    lcd.setCursor(0, 1);
    lcd.print("Bomba LIGADA  ");

  } else {

    digitalWrite(bomba, LOW);

    lcd.setCursor(0, 1);
    lcd.print("Bomba OFF     ");
  }

  delay(1000);
}

