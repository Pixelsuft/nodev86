#ifdef _WIN32
  #include <Windows.h>
  #define V86_API extern "C" __declspec(dllexport)
#else
  #define V86_API extern "C"
#endif
