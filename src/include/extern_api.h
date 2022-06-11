#ifdef _WIN32
  #define WIN32_DARK_THEME

  #include <Windows.h>
  #ifdef WIN32_DARK_THEME
    #include <dwmapi.h>
  #endif
  #define V86_API extern "C" __declspec(dllexport)
#else
  #define V86_API extern "C"
#endif

#define QUIT 1 << 1
#define MOVE 1 << 2
#define CLICK 1 << 3
#define WHEEL 1 << 4
#define KEY 1 << 5
#define CTRL_ALT_DEL 1 << 6
#define SAVE_STATE 1 << 7
#define LOAD_STATE 1 << 8
