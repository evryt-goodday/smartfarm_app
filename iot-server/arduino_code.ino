#include <DHT.h>
#include <Adafruit_NeoPixel.h> 
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// [추가] IoT 기능(Blynk) 라이브러리 및 설정
#define BLYNK_PRINT Serial
#define BLYNK_TEMPLATE_ID "TMPL6vW21Mxm7"
#define BLYNK_TEMPLATE_NAME "SMART FARM"
#define BLYNK_AUTH_TOKEN "OBMBW36FqnvJ42eFWsRnY0MjZvJXQz8P"

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <HTTPClient.h> // [추가] iot-server 통신을 위한 라이브러리

// ==========================================
// 사용자 설정 구역
// ==========================================
char auth[] = BLYNK_AUTH_TOKEN;
char ssid[] = "DEV";       // WiFi 이름
char pass[] = "54865486";   // WiFi 비밀번호

// [추가] iot-server의 IP 주소를 확인하여 변경해주세요 (예: 192.168.0.10)
const char* serverUrl = "http://192.168.0.133:3002/api/sensor/data"; 
const char* controlUrl = "http://192.168.0.133:3002/api/sensor/control/"; // 제어 명령 조회
const char* statusUrl = "http://192.168.0.133:3002/api/sensor/status";   // 실행 결과 보고

// [추가] DB의 actuator_device 테이블에 있는 ID
const int ACTUATOR_ID_FAN = 1;   // 팬 액추에이터 ID
const int ACTUATOR_ID_PUMP = 2;  // 펌프 액추에이터 ID
const int ACTUATOR_ID_LED = 3;   // LED 액추에이터 ID

// [추가] DB의 sensor_device 테이블에 있는 ID
const int SENSOR_ID_TEMP = 1;  // 온도 센서 ID
const int SENSOR_ID_HUMI = 2;  // 습도 센서 ID
const int SENSOR_ID_SOIL = 3;  // 토양 수분 센서 ID
// ==========================================

// DHT11 센서 설정
#define DHTTYPE DHT11
#define DHTPIN 25
DHT dht(DHTPIN, DHTTYPE);

// 팬 모터 핀 설정
#define MOTOR_A1 16 // FAN
#define MOTOR_A2 17 // FAN

// 워터 펌프 모터 핀 설정
#define MOTOR_B1 18 // WATER PUMP
#define MOTOR_B2 19 // WATER PUMP

// 토양 수분 센서 핀 설정
#define SOIL 36 

// 식물생장관리 핀 설정
#define PIN 26          
#define NUMPIXELS 9     
Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

#define BUTTON 23       
#define CDS 39          
bool led_state = false; 

// 디스플레이 설정
#define SCREEN_WIDTH 128 
#define SCREEN_HEIGHT 64 
#define OLED_RESET     -1 
#define SCREEN_ADDRESS 0x3C 
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// 변수 설정
int h, t;
bool fan_state;
int soil_value;
bool pump_state;

// [추가] Blynk 타이머 및 앱 제어 상태 변수
BlynkTimer timer;
bool blynk_fan_state = false;
bool blynk_pump_state = false;

// [추가] 제어 모드 ('auto' 또는 'manual')
String controlMode = "auto";

// [추가] 서버 통신 타이머 변수 (5초마다 데이터 전송)
unsigned long lastTime = 0;
unsigned long timerDelay = 5000;

// [추가] Blynk 앱에서 버튼 조작 시 호출되는 함수들 (V2, V3, V4)
BLYNK_WRITE(V2){
  blynk_fan_state = param.asInt(); // 앱에서 팬 버튼 값 읽기
}

BLYNK_WRITE(V3){
  blynk_pump_state = param.asInt(); // 앱에서 펌프 버튼 값 읽기
}

BLYNK_WRITE(V4){
  led_state = param.asInt(); // 앱에서 LED 버튼 값 읽기
}

void setup() {
  Serial.begin(9600);

  // 핀 모드 설정
  pinMode(MOTOR_A1, OUTPUT);
  pinMode(MOTOR_A2, OUTPUT);
  pinMode(MOTOR_B1, OUTPUT);
  pinMode(MOTOR_B2, OUTPUT);
  pinMode(BUTTON, INPUT);
  
  pixels.begin();
  dht.begin();

  // 디스플레이 초기화
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // [기존] Blynk 연결 및 타이머 설정
  Blynk.begin(auth, ssid, pass);
  
  // 1초(1000L)마다 각 함수를 실행하도록 타이머 설정
  timer.setInterval(1000L, dhtControl);
  timer.setInterval(1000L, fanControl);
  timer.setInterval(1000L, soilControl);
  timer.setInterval(1000L, pumpControl);
  timer.setInterval(1000L, farmLedControl);
  timer.setInterval(1000L, displayControl);
}

void loop() {
  // [기존] Blynk 및 타이머 실행
  Blynk.run();
  timer.run();

  // [추가] 5초마다 iot-server로 데이터 전송 및 제어 명령 확인
  if ((millis() - lastTime) > timerDelay) {
    if(WiFi.status() == WL_CONNECTED){
      // 센서 데이터 전송
      sendDataToServer(SENSOR_ID_HUMI, h);
      sendDataToServer(SENSOR_ID_TEMP, t);
      sendDataToServer(SENSOR_ID_SOIL, (float)soil_value);
      
      // 제어 명령 확인 (polling)
      checkControlCommand(ACTUATOR_ID_FAN);
      checkControlCommand(ACTUATOR_ID_PUMP);
      checkControlCommand(ACTUATOR_ID_LED);
    }
    lastTime = millis();
  }
}

// ==========================================
// [기존] 센서 제어 함수들
// ==========================================

void dhtControl(){
  h = dht.readHumidity();
  t = dht.readTemperature();
  Serial.print("H : ");
  Serial.print(h);
  Serial.print(" % , ");
  Serial.print("T : ");
  Serial.print(t);
  Serial.println(" °C");
  
  // [수정] 자동 모드일 때만 센서 기반 제어
  if(controlMode == "auto"){
    if(h > 70){
      fan_state = true;
    }else{
      fan_state = false;
    }
  }

  // Blynk 앱(V0)으로 습도 전송
  Blynk.virtualWrite(V0, h);
}

void fanControl(){
  // 자동 제어(fan_state) 또는 앱 제어(blynk_fan_state) 중 하나라도 켜짐이면 작동
  if(fan_state || blynk_fan_state){
    fan_on();
  }else{
    fan_off();
  }
}

void fan_on(){
  digitalWrite(MOTOR_A1, LOW);
  digitalWrite(MOTOR_A2, HIGH);
}

void fan_off(){
  digitalWrite(MOTOR_A1,LOW);
  digitalWrite(MOTOR_A2, LOW);
}

void soilControl(){
  soil_value = map(analogRead(SOIL), 3600, 1200, 0, 100);
  
  Serial.print("S : ");
  Serial.print(soil_value);
  Serial.println(" %");

  // [수정] 자동 모드일 때만 센서 기반 제어
  if(controlMode == "auto"){
    if(soil_value < 20){
      pump_state = true;
    }else{
      pump_state = false;
    }
  }

  // Blynk 앱(V1)으로 토양 수분 전송
  Blynk.virtualWrite(V1, soil_value);
}

void pumpControl(){
  // 자동 제어(pump_state) 또는 앱 제어(blynk_pump_state) 중 하나라도 켜짐이면 작동
  if(pump_state || blynk_pump_state){
    water_pump_on();
  }else{
    water_pump_stop();
  }
}

void water_pump_on(){
  digitalWrite(MOTOR_B1, HIGH);
  digitalWrite(MOTOR_B2, LOW);
}

void water_pump_stop(){
  digitalWrite(MOTOR_B1, LOW);
  digitalWrite(MOTOR_B2, LOW);
}

void farmLedControl(){
  int cds_value = analogRead(CDS);
  Serial.print("Light : ");
  Serial.println(cds_value);

  // 물리 버튼 제어
  if(digitalRead(BUTTON)){
    led_state = !led_state;
    // 변경된 LED 상태를 앱(V4)으로 업데이트
    Blynk.virtualWrite(V4, led_state); 
    delay(100); 
  }

  // [수정] 자동 모드일 때만 조도 센서 기반 제어
  if(controlMode == "auto"){
    if(cds_value < 200){
      led_state = true;
    }
  }

  // LED 상태에 따라 네오픽셀 제어
  if(led_state){
    for(int i=0; i<NUMPIXELS; i++) {
      if(i%2 == 0){
        pixels.setPixelColor(i, pixels.Color(150, 0, 0));
      }else{
        pixels.setPixelColor(i, pixels.Color(0, 0, 150));
      }
    }
  }else{
    pixels.clear();
  }
  pixels.show(); 
}

void displayControl(){
  display.clearDisplay();
  
  // 제목 및 모드 표시
  display.setCursor(0,0);
  display.print("IoT SMART FARM");
  display.setCursor(95, 0);
  display.print(controlMode == "auto" ? "AUTO" : "MANU");
  
  display.setCursor(0,10);
  display.print("HUMI : ");
  display.print(h);
  display.print(" %");
  
  display.setCursor(0,20);
  display.print("TEMP : ");
  display.print(t);
  display.print(" C");
  
  display.setCursor(0,30);
  display.print("SOIL : ");
  display.print(soil_value);
  display.print(" %");
  
  // [추가] 액추에이터 상태 표시
  display.setCursor(0,40);
  display.print("F:");
  display.print(fan_state || blynk_fan_state ? "ON " : "OFF");
  display.print(" P:");
  display.print(pump_state || blynk_pump_state ? "ON " : "OFF");
  display.print(" L:");
  display.print(led_state ? "ON" : "OFF");
  
  display.display();
}

// ==========================================
// [추가] iot-server 통신 함수들
// ==========================================

/**
 * 서버로 데이터 전송 함수
 * POST /api/sensor/data
 */
void sendDataToServer(int sensorId, float value) {
  HTTPClient http;
  
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // JSON 생성: 센서 값 + 액추에이터 상태 + 모드
  String requestBody = "{";
  requestBody += "\"sensorId\":" + String(sensorId) + ",";
  requestBody += "\"value\":" + String(value) + ",";
  requestBody += "\"actuators\":{";
  requestBody += "\"fan\":" + String((fan_state || blynk_fan_state) ? "true" : "false") + ",";
  requestBody += "\"pump\":" + String((pump_state || blynk_pump_state) ? "true" : "false") + ",";
  requestBody += "\"led\":" + String(led_state ? "true" : "false");
  requestBody += "},";
  requestBody += "\"mode\":\"" + controlMode + "\"";
  requestBody += "}";
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    Serial.print("Sensor "); Serial.print(sensorId);
    Serial.print(" sent. Code: "); Serial.println(httpResponseCode);
  } else {
    Serial.print("Error: "); Serial.println(httpResponseCode);
  }
  
  http.end();
}

/**
 * 제어 명령 조회 함수
 * GET /api/sensor/control/:actuatorId
 */
void checkControlCommand(int actuatorId) {
  HTTPClient http;
  
  // URL 생성: http://192.168.0.XX:3002/api/sensor/control/1
  String url = String(controlUrl) + String(actuatorId);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    // JSON 파싱 (간단한 방법)
    if (response.indexOf("\"hasCommand\":true") > 0) {
      // 명령이 있음
      int commandIdStart = response.indexOf("\"commandId\":") + 12;
      int commandIdEnd = response.indexOf(",", commandIdStart);
      String commandIdStr = response.substring(commandIdStart, commandIdEnd);
      int commandId = commandIdStr.toInt();
      
      // command 추출
      int commandStart = response.indexOf("\"command\":\"") + 11;
      int commandEnd = response.indexOf("\"", commandStart);
      String command = response.substring(commandStart, commandEnd);
      
      Serial.print("Received Command: ");
      Serial.print(command);
      Serial.print(" (ID: ");
      Serial.print(commandId);
      Serial.println(")");
      
      // 명령 실행
      executeCommand(actuatorId, command, commandId);
    }
  } else if (httpResponseCode != 404) {
    Serial.print("Error checking command: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

/**
 * 명령 실행 함수
 */
void executeCommand(int actuatorId, String command, int commandId) {
  bool success = true;
  
  // 모드 변경 명령
  if (command == "auto") {
    controlMode = "auto";
    // 자동 모드로 변경 시 Blynk 제어 상태 초기화
    blynk_fan_state = false;
    blynk_pump_state = false;
    Serial.println("Mode changed to AUTO");
  } 
  else if (command == "manual") {
    controlMode = "manual";
    Serial.println("Mode changed to MANUAL");
  }
  // 액추에이터 ON/OFF 명령 (수동 모드에서만 적용)
  else if (controlMode == "manual") {
    if (actuatorId == ACTUATOR_ID_FAN) {
      // 수동 명령은 Blynk 상태 변수 사용
      blynk_fan_state = (command == "on");
      Serial.print("Fan: ");
      Serial.println(blynk_fan_state ? "ON" : "OFF");
    }
    else if (actuatorId == ACTUATOR_ID_PUMP) {
      blynk_pump_state = (command == "on");
      Serial.print("Pump: ");
      Serial.println(blynk_pump_state ? "ON" : "OFF");
    }
    else if (actuatorId == ACTUATOR_ID_LED) {
      led_state = (command == "on");
      Serial.print("LED: ");
      Serial.println(led_state ? "ON" : "OFF");
    }
  }
  
  // 실행 결과 보고
  sendCommandResult(commandId, "executed", "");
}

/**
 * 명령 실행 결과 보고 함수
 * POST /api/sensor/status
 */
void sendCommandResult(int commandId, String status, String errorMessage) {
  HTTPClient http;
  
  http.begin(statusUrl);
  http.addHeader("Content-Type", "application/json");
  
  // JSON 생성
  String requestBody = "{";
  requestBody += "\"commandId\":" + String(commandId) + ",";
  requestBody += "\"status\":\"" + status + "\",";
  requestBody += "\"actuators\":{";
  requestBody += "\"fan\":" + String((fan_state || blynk_fan_state) ? "true" : "false") + ",";
  requestBody += "\"pump\":" + String((pump_state || blynk_pump_state) ? "true" : "false") + ",";
  requestBody += "\"led\":" + String(led_state ? "true" : "false");
  requestBody += "}";
  
  if (errorMessage != "") {
    requestBody += ",\"errorMessage\":\"" + errorMessage + "\"";
  }
  
  requestBody += "}";
  
  Serial.print("Sending result: ");
  Serial.println(requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    Serial.print("Result sent. Code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Error sending result: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
