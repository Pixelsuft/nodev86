#include <iostream>
#include <cstdlib>
#include <math.h>
#include <sys/time.h>
#include <extern_api.h>
#define PMTIMER_FREQ_SECONDS 3579545


using namespace std;

uint16_t acpi_status = 1;
uint16_t acpi_pm1_status = 0;
uint16_t acpi_pm1_enable = 0;
uint32_t acpi_last_timer = 0;

uint8_t acpi_gpe[4] = { 0, 0, 0, 0 };

int acpi_last_result = 0;
uint64_t acpi_start_time = 0;
uint16_t acpi_state[7];

uint32_t acpi_timer_last_value = 0;
uint32_t acpi_timer_imprecision_offset = 0;

bool acpi_accurate = false;

V86_API void acpi_enable_accurate() {
  acpi_accurate = true;
}

V86_API uint16_t* acpi_get_state() {
  acpi_state[0] = acpi_status;
  acpi_state[1] = acpi_pm1_status;
  acpi_state[2] = acpi_pm1_enable;
  acpi_state[3] = (uint16_t)acpi_gpe[0];
  acpi_state[4] = (uint16_t)acpi_gpe[1];
  acpi_state[5] = (uint16_t)acpi_gpe[2];
  acpi_state[6] = (uint16_t)acpi_gpe[3];
  return acpi_state;
}

V86_API void acpi_set_state(uint16_t* acpi_state) {
  acpi_status = acpi_state[0];
  acpi_pm1_status = acpi_state[1];
  acpi_pm1_enable = acpi_state[2];
  acpi_gpe[0] = (uint8_t)acpi_state[3];
  acpi_gpe[1] = (uint8_t)acpi_state[4];
  acpi_gpe[2] = (uint8_t)acpi_state[5];
  acpi_gpe[3] = (uint8_t)acpi_state[6];
}

V86_API uint64_t acpi_microtick() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  uint64_t hi = (uint64_t)tv.tv_sec * (uint64_t)1000000 + (uint64_t)tv.tv_usec;
  if (!acpi_start_time)
    acpi_start_time = hi;
  return hi - acpi_start_time;
}

V86_API uint32_t acpi_get_timer(uint64_t now) {
  uint32_t t = round((double)now * (double)PMTIMER_FREQ_SECONDS / (double)1000000);
  if (!acpi_accurate)
    return t;
  if (t == acpi_timer_last_value) {
    if (acpi_timer_imprecision_offset < (uint32_t)PMTIMER_FREQ_SECONDS / (uint32_t)1000000) {
      acpi_timer_imprecision_offset++;
    }
  }
  else {
    uint32_t previous_timer = acpi_timer_last_value + acpi_timer_imprecision_offset;
    if (previous_timer <= t) {
      acpi_timer_imprecision_offset = 0;
      acpi_timer_last_value = t;
    }
  }
  return acpi_timer_last_value + acpi_timer_imprecision_offset;
}

V86_API int acpi_get_result() {
  return acpi_last_result;
}

V86_API bool acpi_timer(uint64_t now) {
  uint32_t timer = acpi_get_timer(now);
  bool highest_bit_changed = ((timer ^ acpi_last_timer) & (1 << 23)) != 0;
  bool is_lower = false;

  if ((acpi_pm1_enable & 1) && highest_bit_changed) {
    acpi_pm1_status |= 1;
    is_lower = false;
  }
  else {
    is_lower = true;
  }

  if (acpi_pm1_enable & 1)
    acpi_last_result = (int)(((uint64_t)0x1000000 - now) / (uint64_t)1000000 * (uint64_t)PMTIMER_FREQ_SECONDS);
  else
    acpi_last_result = -1;
  acpi_last_timer = timer;

  return is_lower;
}

V86_API uint8_t acpi_read8(uint32_t addr) {
  switch (addr) {
    case 0xAFE0:
      return acpi_gpe[0];
    case 0xAFE1:
      return acpi_gpe[1];
    case 0xAFE2:
      return acpi_gpe[2];
    case 0xAFE3:
      return acpi_gpe[3];
    default:
      return 0;
  }
}

V86_API uint16_t acpi_read16(uint32_t addr) {
  switch (addr) {
    case 0xB000:
      return acpi_pm1_status;
    case 0xB002:
      return acpi_pm1_enable;
    case 0xB004:
      return acpi_status;
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
      acpi_gpe[0] = value;
      break;
    case 0xAFE1:
      acpi_gpe[1] = value;
      break;
    case 0xAFE2:
      acpi_gpe[2] = value;
      break;
    case 0xAFE3:
      acpi_gpe[3] = value;
      break;
    default:
      // Maybe add something???
      break;
  }
}

V86_API void acpi_write16(uint32_t addr, uint16_t value) {
  switch (addr) {
    case 0xB000:
      acpi_pm1_status &= ~value;
      break;
    case 0xB002:
      acpi_pm1_enable = value;
      break;
    case 0xB004:
      acpi_status = value;
      break;
    default:
      // Maybe add something???
      break;
  }
}
