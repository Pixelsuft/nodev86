#include <iostream>
#include <cstdlib>
#include <string>
#include <vector>
#include <chrono>
#include <extern_api.h>


using namespace std;

V86_API uint64_t rtc_get_now() {
  return chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
}
