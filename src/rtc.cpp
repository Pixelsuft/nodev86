#include <iostream>
#include <cstdlib>
#include <string>
#include <vector>
#include <sys/time.h>
#include <extern_api.h>
#define CMOS_FREQUENCY 32768
#define ALARM_SEC 1
#define ALARM_MIN 3
#define ALARM_HOUR 5
#define PERIODIC 0x40
#define ALARM 0x20
#define UPDATE 0x10


using namespace std;

uint8_t cmos_ram[128];
uint8_t cmos_addr, cmos_nmi;
time_t cmos_now;
int cmos_periodic_ticks,
  cmos_periodic_ticks_max,
  cmos_last_raise;
uint32_t cmos_period;
uint64_t cmos_last_called,
  cmos_uip_period,
  cmos_last_second_update,
  cmos_start_time;

V86_API void cmos_set(uint8_t where, uint8_t data)
{
    cmos_ram[where] = data;
}

V86_API uint8_t cmos_get(uint8_t where)
{
    //cout << (int)where << " " << (int)cmos_ram[where] << endl;
    return cmos_ram[where];
}

V86_API int cmos_get_raise() {
  return cmos_last_raise;
}

V86_API bool cmos_should_lower() {
  return cmos_addr == 0x0C;
}

#define cmos_is24hour() (cmos_ram[0x0B] & 2)

V86_API uint64_t cmos_get_now() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  uint64_t hi = (uint64_t)tv.tv_sec * (uint64_t)1000000 + (uint64_t)tv.tv_usec;
  if (!cmos_start_time)
    cmos_start_time = hi;
  return hi - cmos_start_time;
}

static uint8_t cmos_bcd_read(uint8_t val)
{
    if (cmos_ram[0x0B] & 4)
        return val;
    else
        return ((val / 10) << 4) | (val % 10);
}

V86_API uint8_t cmos_ram_read(uint8_t addr)
{
    struct tm* now;
    uint64_t now_ticks, next_second;
    switch (addr) {
    case 0:
        now = localtime(&cmos_now);
        return cmos_bcd_read(now->tm_sec);
    case 2:
        now = localtime(&cmos_now);
        return cmos_bcd_read(now->tm_min);
    case 4:
        now = localtime(&cmos_now);
        if (cmos_is24hour())
            return cmos_bcd_read(now->tm_hour);
        else
            return cmos_bcd_read(now->tm_hour % 12) | (now->tm_hour > 12) << 7;
    case 6:
        now = localtime(&cmos_now);
        return cmos_bcd_read(now->tm_wday + 1);
    case 7:
        now = localtime(&cmos_now);
        return cmos_bcd_read(now->tm_mday);
    case 8:
        now = localtime(&cmos_now);
        return cmos_bcd_read(now->tm_mon + 1);
    case 9:
        now = localtime(&cmos_now);
        return cmos_bcd_read(now->tm_year % 100);
    case 1:
    case 3:
    case 5:
        return cmos_ram[cmos_addr];
    case 0x0A:
        now_ticks = cmos_get_now();
        next_second = cmos_last_second_update + 1000000;

        if(now_ticks >= (next_second-cmos_uip_period) && now_ticks < next_second){
            return cmos_ram[0x0A] | 0x80;
        }
    case 0x0B:
        return cmos_ram[cmos_addr];
    case 0x0C: {
        cout << "should lower" << endl;
        int res = cmos_ram[0x0C];
        cmos_ram[0x0C] = 0;
        return res;
    }
    case 0x0D:
        return 0x80;
    default:
        return 0x00;
    }
}

V86_API uint32_t cmos_readb_70() {
  return 0xFF;
}

V86_API uint32_t cmos_readb_71() {
  cout << "ram read " << (int)cmos_addr << endl;
  if (cmos_addr <= 0x0D)
      return cmos_ram_read(cmos_addr);
  else
      return cmos_ram[cmos_addr];
}

V86_API void cmos_update_timer()
{
    int period = cmos_ram[0x0A] & 0x0F;

    if (!period)
        return;

    if (period < 3)
        period += 7;

    int freq = CMOS_FREQUENCY >> (period - 1);

    if (cmos_ram[0x0B] & 0x40) {
        cmos_period = 1000000 / freq;
        cmos_periodic_ticks = 0;
        cmos_periodic_ticks_max = freq;
    } else {
        cmos_period = 1000000;
    }
    cmos_last_called = cmos_get_now();
}

static inline int bcd(int data)
{
    if (cmos_ram[0x0B] & 4)
        return data;
    return ((data & 0xf0) >> 1) + ((data & 0xf0) >> 3) + (data & 0x0f);
}

V86_API void cmos_ram_write(uint8_t data)
{
    struct tm* now = localtime(&cmos_now);

    switch (cmos_addr) {
    case 1:
    case 3:
    case 5:
        cmos_set(cmos_addr, data);
        break;
    case 0:
        now->tm_sec = bcd(data);
        break;
    case 2:
        now->tm_min = bcd(data);
        break;
    case 4:
        now->tm_hour = bcd(data & 0x7F);
        if (!cmos_is24hour())
            if (data & 0x80)
                now->tm_hour += 12;
        break;
    case 6:
        now->tm_wday = bcd(data);
        break;
    case 7:
        now->tm_mday = bcd(data);
        break;
    case 8:
        now->tm_mon = bcd(data);
        break;
    case 9:
        now->tm_year = bcd(data) + (bcd(cmos_ram[0x32]) - 19) * 100;
		if(now->tm_year < 70) now->tm_year = 70;
        break;
    case 0x0A:
        cmos_ram[0x0A] = (data & 0x7F) | (cmos_ram[0x0A] & 0x80);
        cmos_update_timer();
        break;
    case 0x0B:
        cmos_ram[0x0B] = data;
        cmos_update_timer();
        break;
    case 0x0C ... 0x0D:
        break;
    }
    cmos_now = mktime(now);
}

V86_API void cmos_writeb_70(uint32_t data) {
    cmos_nmi = data >> 7;
    cmos_addr = data & 0x7F;
}

V86_API void cmos_writeb_71(uint32_t data) {
    if (cmos_addr <= 0x0D)
        cmos_ram_write(data);
    else
        cmos_ram[cmos_addr] = data;
}

int cmos_clock(uint64_t now)
{
    uint64_t next = cmos_last_called + cmos_period;

    if (now >= next) {
        cmos_last_raise = 0;

        if (cmos_ram[0x0B] & 0x40) {
            cmos_last_raise |= PERIODIC;

            cmos_periodic_ticks++;
            if (cmos_periodic_ticks != cmos_periodic_ticks_max)
                goto done;

            cmos_periodic_ticks = 0;
        }

        cmos_now++;
        if (cmos_ram[0x0B] & 0x20) {
            int ok = 1;
            ok &= cmos_ram_read(ALARM_SEC) == cmos_ram_read(0);
            ok &= cmos_ram_read(ALARM_MIN) == cmos_ram_read(2);
            ok &= cmos_ram_read(ALARM_HOUR) == cmos_ram_read(4);
            if (ok)
                cmos_last_raise |= ALARM;
        }
        if (cmos_ram[0x0B] & 0x10) {
            cmos_last_raise |= UPDATE;
        }

        cmos_last_second_update = now;

    done:
        cmos_last_called = cmos_get_now();
        if (cmos_last_raise) {
            cmos_ram[0x0C] = 0x80 | cmos_last_raise;
            return 1;
        }
    }
    return 0;
}

V86_API int cmos_next(uint64_t now)
{
    cmos_clock(now);
    return cmos_last_called + cmos_period - now;
}

V86_API void cmos_init(uint64_t now)
{
    if(now == 0) now = time(NULL);
    cmos_now = now;
    cmos_last_second_update = cmos_get_now();

    cmos_uip_period = 244;

    cmos_last_called = cmos_get_now();
    cmos_period = 1000000;
}
