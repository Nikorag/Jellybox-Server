# Jellybox PCB - Simple Connector Guide

## 30-pin ESP32 Header

### Left Header (15 pins, top→bottom)

```
 1  EN
 2  VP (GPIO36)
 3  VN (GPIO39)
 4  D34
 5  D35
 6  D32
 7  D33
 8  D25
 9  D26
10  D27 → NeoPixel DATA (via 330-470Ω resistor)
11  D14
12  D12
13  D13
14  GND → GND rail
15  VIN (5V from TP4056)
```

### Right Header (15 pins, top→bottom)

```
 1  D23 → eInk DIN
 2  D22 → PN532 SCL
 3  TX0
 4  RX0
 5  D21 → PN532 SDA
 6  D19
 7  D18 → eInk SCK
 8  D5  → eInk CS
 9  D17 → eInk DC
10  D16 → eInk RST
11  D4  → eInk BUSY
12  D2
13  D15
14  GND → GND rail
15  3V3 → 3V3 rail
```

-----

## PN532 Connector (4 pads)

|Pad|Signal|Connect to              |
|---|------|------------------------|
|1  |VCC   |3V3 rail                |
|2  |GND   |GND rail                |
|3  |SDA   |D21 (right header pin 5)|
|4  |SCL   |D22 (right header pin 2)|

-----

## NeoPixel Ring Connector (3 pads)

|Pad|Signal |Connect to                                        |
|---|-------|--------------------------------------------------|
|1  |GND    |GND rail                                          |
|2  |DATA IN|D27 (left header pin 10) **via 330-470Ω resistor**|
|3  |PWR    |3V3 rail                                          |

-----

## eInk Display Connector (8 pads)

|Pad|Signal   |Connect to               |
|---|---------|-------------------------|
|1  |VCC      |3V3 rail                 |
|2  |GND      |GND rail                 |
|3  |DIN / SDA|D23 (right header pin 1) |
|4  |CLK / SCL|D18 (right header pin 7) |
|5  |CS       |D5 (right header pin 8)  |
|6  |DC       |D17 (right header pin 9) |
|7  |RST      |D16 (right header pin 10)|
|8  |BUSY     |D4 (right header pin 11) |

-----

## TP4056 Charger Connector (4 pads)

|Pad|Signal|Connect to              |
|---|------|------------------------|
|1  |OUT+  |VIN (left header pin 15)|
|2  |OUT−  |GND rail                |
|3  |B+    |BAT+ pad                |
|4  |B−    |BAT− pad                |

-----

## Battery Pads (2 pads)

|Pad|Signal|Connect to   |
|---|------|-------------|
|1  |BAT+  |TP4056 B+ pad|
|2  |BAT−  |TP4056 B− pad|

-----

## Power Rails

- **3V3** fed from right header pin 15 (ESP32’s onboard LDO)
- **GND** connect left header pin 14 and right header pin 14 to GND rail
