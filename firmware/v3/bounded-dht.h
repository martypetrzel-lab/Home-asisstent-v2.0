// Vendored Adafruit DHT sensor library 1.4.7 (MIT).
// Local fix: real 150us pulse deadlines, immediate abort, 10ms capture deadline.
/*!
 *  @file BoundedDHT.h
 *
 *  This is a library for BoundedDHT series of low cost temperature/humidity sensors.
 *
 *  You must have Adafruit Unified Sensor Library library installed to use this
 * class.
 *
 *  Adafruit invests time and resources providing this open source code,
 *  please support Adafruit andopen-source hardware by purchasing products
 *  from Adafruit!
 *
 *  Written by Adafruit Industries.
 *
 *  MIT license, all text above must be included in any redistribution
 */

#ifndef HOME_BOUNDED_DHT_H
#define HOME_BOUNDED_DHT_H

#include "Arduino.h"

/* Uncomment to enable printing out nice debug messages. */
// #define BDHT_DEBUG

#define BDHT_DEBUG_PRINTER                                    \
  Serial /**< Define where debug output will be printed. \
          */

/* Setup debug printing macros. */
#ifdef BDHT_DEBUG
#define BDHT_DEBUG_PRINT(...) \
  { BDHT_DEBUG_PRINTER.print(__VA_ARGS__); }
#define BDHT_DEBUG_PRINTLN(...) \
  { BDHT_DEBUG_PRINTER.println(__VA_ARGS__); }
#else
#define BDHT_DEBUG_PRINT(...) \
  {} /**< Debug Print Placeholder if Debug is disabled */
#define BDHT_DEBUG_PRINTLN(...) \
  {} /**< Debug Print Line Placeholder if Debug is disabled */
#endif

/* Define types of sensors. */
static const uint8_t BDHT11{11};  /**< BoundedDHT TYPE 11 */
static const uint8_t BDHT12{12};  /**< DHY TYPE 12 */
static const uint8_t BDHT21{21};  /**< BoundedDHT TYPE 21 */
static const uint8_t BDHT22{22};  /**< BoundedDHT TYPE 22 */
static const uint8_t BAM2301{21}; /**< BAM2301 */

#if defined(TARGET_NAME) && (TARGET_NAME == ARDUINO_NANO33BLE)
#ifndef microsecondsToClockCycles
/*!
 * As of 7 Sep 2020 the Arduino Nano 33 BLE boards do not have
 * microsecondsToClockCycles defined.
 */
#define microsecondsToClockCycles(a) ((a) * (SystemCoreClock / 1000000L))
#endif
#endif

/*!
 *  @brief  Class that stores state and functions for BoundedDHT
 */
class BoundedDHT {
 public:
  BoundedDHT(uint8_t pin, uint8_t type, uint8_t count = 6);
  void begin(uint8_t usec = 55);
  float readTemperature(bool S = false, bool force = false);
  float convertCtoF(float);
  float convertFtoC(float);
  float computeHeatIndex(bool isFahrenheit = true);
  float computeHeatIndex(float temperature, float percentHumidity,
                         bool isFahrenheit = true);
  float readHumidity(bool force = false);
  bool read(bool force = false);

 private:
  uint8_t data[5];
  uint8_t _pin, _type;
#ifdef __AVR
  // Use direct GPIO access on an 8-bit AVR so keep track of the port and
  // bitmask for the digital pin connected to the BoundedDHT.  Other platforms will use
  // digitalRead.
  uint8_t _bit, _port;
#endif
  uint32_t _lastreadtime, _maxcycles;
  bool _lastresult;
  uint8_t pullTime; // Time (in usec) to pull up data line before reading

  uint32_t expectPulse(bool level);
};

/*!
 *  @brief  Class that defines Interrupt Lock Avaiability
 */
class BoundedDhtInterruptLock {
 public:
  BoundedDhtInterruptLock() {
#if !defined(ARDUINO_ARCH_NRF52)
    noInterrupts();
#endif
  }
  ~BoundedDhtInterruptLock() {
#if !defined(ARDUINO_ARCH_NRF52)
    interrupts();
#endif
  }
};

#endif

