/*
 * Dust Sensor BLE
 * written by Elijah Scheele 2016
 * 
 * Sharp Dust Sensor readout code from:
 * http://arduinodev.woofex.net/2012/12/01/standalone-sharp-dust-sensor/
 * 
 * Authors: Cyrille Médard de Chardon (serialC), Christophe Trefois (Trefex)
 *This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License. 
 *To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/3.0/ or send a letter 
 *to Creative Commons, 444 Castro Street, Suite 900, Mountain View, California, 94041, USA.  
 * 
 */


#include <BLEAttribute.h>
#include <BLECentral.h>
#include <BLECharacteristic.h>
#include <BLECommon.h>
#include <BLEDescriptor.h>
#include <BLEPeripheral.h>
#include <BLEService.h>
#include <BLETypedCharacteristic.h>
#include <BLETypedCharacteristics.h>
#include <BLEUuid.h>
#include <CurieBLE.h>

const int dustPin = A0;
const int ledPin = 12;

//timing constants
const int samplingTime = 280;
const int deltaTime = 40;
const int sleepTime = 9680;

float voMeasured = 0;
float calcVoltage = 0;
float dustDensity = 0;

//BLE
BLEPeripheral blePeripheral;
BLEService bleService("19B10040-E8F2-537E-4F6C-D104768A1214");
BLEFloatCharacteristic dustCharacteristic("19B10041-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);

void setup() {

  //setup and initialize BLE
  blePeripheral.setLocalName("DustSense");
  blePeripheral.setAdvertisedServiceUuid(bleService.uuid());
  blePeripheral.addAttribute(bleService);
  blePeripheral.addAttribute(dustCharacteristic);
  dustCharacteristic.setValue(0);
  blePeripheral.begin();

  //set pinMode for D12
  pinMode(ledPin, OUTPUT);

}

void loop() {
 blePeripheral.poll();

 //from http://arduinodev.woofex.net/2012/12/01/standalone-sharp-dust-sensor/
  digitalWrite(ledPin,LOW); // power on the LED
  delayMicroseconds(samplingTime);

  voMeasured = analogRead(dustPin); // read the dust value
  
  delayMicroseconds(deltaTime);
  digitalWrite(ledPin,HIGH); // turn the LED off
  delayMicroseconds(sleepTime);

  // 0 - 3.3V mapped to 0 - 1023 integer values 
  calcVoltage = voMeasured * (3.3 / 1024); 
  
  // linear eqaution taken from http://www.howmuchsnow.com/arduino/airquality/
  // Chris Nafis (c) 2012
  dustDensity = (0.17 * calcVoltage - 0.1)*1000;


  boolean dustChanged = (dustCharacteristic.value() != dustDensity);

  if (dustChanged) {
    dustCharacteristic.setValue(dustDensity);
  }
  delay(1000);

}
