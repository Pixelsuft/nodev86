#include <iostream>
#include <cstdlib>
#include <sys/time.h>
#include <extern_api.h>
#define PMTIMER_FREQ_SECONDS 3579545


using namespace std;

uint16_t status = 1;
uint16_t pm1_status = 0;
uint16_t pm1_enable = 0;
uint32_t last_timer = 0;

uint8_t gpe[4] = { 0, 0, 0, 0 };

int last_result = 0;
uint64_t acpi_start_time;

V86_API uint64_t acpi_microtick() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  uint64_t hi = (uint64_t)tv.tv_sec * (uint64_t)1000000 + (uint64_t)tv.tv_usec;
  if (!acpi_start_time)
    acpi_start_time = hi;
  return hi - acpi_start_time;
}

V86_API uint32_t acpi_get_timer(uint64_t now) {
  return (double)now * (double)PMTIMER_FREQ_SECONDS / (double)1000000;
}

V86_API int acpi_get_result() {
  return last_result;
}

V86_API bool acpi_timer(uint64_t now) {
  uint32_t timer = acpi_get_timer(now);
  bool highest_bit_changed = ((timer ^ last_timer) & (1 << 23)) != 0;
  bool is_lower = false;

  if ((pm1_enable & 1) && highest_bit_changed) {
    pm1_status |= 1;
    is_lower = false;
  }
  else {
    is_lower = true;
  }

  last_result = (int)(((uint64_t)0x1000000 - now) / (uint64_t)1000000 * (uint64_t)PMTIMER_FREQ_SECONDS);
  last_timer = timer;

  return is_lower;
}

V86_API uint8_t acpi_read8(uint32_t addr) {
  switch (addr) {
    case 0xAFE0:
      return gpe[0];
    case 0xAFE1:
      return gpe[1];
    case 0xAFE2:
      return gpe[2];
    case 0xAFE3:
      return gpe[3];
    default:
      return 0;
  }
}

V86_API uint16_t acpi_read16(uint32_t addr) {
  switch (addr) {
    case 0xB000:
      return pm1_status;
    case 0xB002:
      return pm1_enable;
    case 0xB004:
      return status;
    default:
      return 0;
  }
}

V86_API uint32_t acpi_read32(uint32_t addr) {
  if (addr != 0xB008)
    return 0;
  return acpi_get_timer(acpi_microtick()) & 0xFFFFFF;
}

V86_API void acpi_write8(uint32_t addr, uint8_t value) {
  switch (addr) {
    case 0xAFE0:
      gpe[0] = value;
      break;
    case 0xAFE1:
      gpe[1] = value;
      break;
    case 0xAFE2:
      gpe[2] = value;
      break;
    case 0xAFE3:
      gpe[3] = value;
      break;
    default:
      // Maybe add something???
      break;
  }
}

V86_API void acpi_write16(uint32_t addr, uint16_t value) {
  switch (addr) {
    case 0xB000:
      pm1_status &= ~value;
      break;
    case 0xB002:
      pm1_enable = value;
      break;
    case 0xB004:
      status = value;
      break;
    default:
      // Maybe add something???
      break;
  }
}
