
#include <LiquidCrystal.h>

// LCD
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

// Pinos
const int sensorUmidade = A0;
const int bomba = 8;

int limiteUmidade = 500;

void setup() {
  pinMode(bomba, OUTPUT);
  digitalWrite(bomba, LOW);

  Serial.begin(9600);

  lcd.begin(16, 2);
  lcd.print("Sistema");
  lcd.setCursor(0, 1);
  lcd.print("Irrigador");
  delay(2000);
  lcd.clear();
}

void loop() {

  int umidade = analogRead(sensorUmidade);

  Serial.print("Umidade: ");
  Serial.println(umidade);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Umidade:");
  lcd.print(umidade);

  if (umidade < limiteUmidade) {
    digitalWrite(bomba, HIGH);

    lcd.setCursor(0, 1);
    lcd.print("Bomba LIGADA");
  }
  else {
    digitalWrite(bomba, LOW);

    lcd.setCursor(0, 1);
    lcd.print("Bomba DESLIG.");
  }

  delay(1000);
}
