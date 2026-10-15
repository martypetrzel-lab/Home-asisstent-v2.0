#pragma once
#include <cmath>
#include <cstdint>
#include <cstdlib>
using word = uint16_t;
#define F_CPU 240000000L
#define microsecondsToClockCycles(x) ((x) * 240UL)
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define INPUT_PULLUP 2
uint32_t millis();
uint32_t micros();
void delay(unsigned long);
void delayMicroseconds(unsigned int);
void pinMode(uint8_t, uint8_t);
void digitalWrite(uint8_t, uint8_t);
int digitalRead(uint8_t);
void noInterrupts();
void interrupts();
