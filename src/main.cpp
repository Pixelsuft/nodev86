#include <iostream>
#include <cstdlib>
#include <string>
#include <vector>
#include <chrono>
#include <math.h>
#include <sys/time.h>
#include <extern_api.h>
#include <scancode.h>
#include <charcode.h>
#include <SDL2/SDL.h>
#ifdef WIN32_DARK_THEME
  #include <SDL2/SDL_syswm.h>
#endif
#include <SDL2/SDL_ttf.h>


using namespace std;

int char_size[2] = { 9, 16 };
int font_size = 15;
bool anti_aliassing = false;
bool mouse_locked = false;
bool load_font = false;
int last_mouse_move[2] = { 0, 0 };
bool button_states[3] = { false, false, false };
int last_wheel = 0;
vector<int> last_keys;
uint64_t base_time;

SDL_Window* window;
SDL_Renderer* renderer;
TTF_Font* font;

bool is_graphical = false;
int char_count[2] = { 80, 25 };
int screen_size_text[2] = { char_count[0] * char_size[0], char_count[1] * char_size[1] };
int screen_size_graphical[2] = { 320, 200 };
bool is_loading = false;
bool should_center = true;

const string format_title() {
  string result("nodev86 [");
  result += is_graphical ? "Graphical" : "Text";
  result += "] [";
  result += to_string((is_graphical ? screen_size_graphical : screen_size_text)[0]);
  result += "x";
  result += to_string((is_graphical ? screen_size_graphical : screen_size_text)[1]);
  result += "]";
  if (mouse_locked)
    result += " [Press ESC to Unlock Mouse]";
  result += " [";
  result += is_loading ? "Loading" : "Idle";
  result += "]";
  return result;
}

void update_title() {
  SDL_SetWindowTitle(window, format_title().data());
}

void update_should_center() {
  int window_x, window_y, need_x, need_y, window_w, window_h, screen_w, screen_h;
  SDL_GetWindowPosition(window, &window_x, &window_y);
  SDL_GetWindowSize(window, &window_w, &window_h);
  SDL_DisplayMode dm;
  if (window_x == 0 || window_y == 0 || SDL_GetCurrentDisplayMode(0, &dm) != 0) {
    should_center = false;
    return;
  }
  if ((window_x < 0 || window_y < 0) && should_center) {
    return;
  }
  screen_w = dm.w;
  screen_h = dm.h;
  need_x = round((float)screen_w / 2.0f - (float)window_w / 2.0f);
  need_y = round((float)screen_h / 2.0f - (float)window_h / 2.0f);
  should_center = window_x == need_x && window_y == need_y;
}

void update_center() {
  if (!should_center)
    return;
  int need_x, need_y, window_w, window_h, screen_w, screen_h;
  SDL_GetWindowSize(window, &window_w, &window_h);
  SDL_DisplayMode dm;
  if (SDL_GetCurrentDisplayMode(0, &dm) != 0)
    return;
  screen_w = dm.w;
  screen_h = dm.h;
  need_x = round((float)screen_w / 2.0f - (float)window_w / 2.0f);
  need_y = round((float)screen_h / 2.0f - (float)window_h / 2.0f);
  SDL_SetWindowPosition(window, need_x, need_y);
}

V86_API uint64_t microtick() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  uint64_t hi = (uint64_t)tv.tv_sec * (uint64_t)1000000 + (uint64_t)tv.tv_usec;
  if (!base_time)
    base_time = hi;
  return hi - base_time;
}

V86_API uint64_t get_now() {
  return chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
}

V86_API void destroy() {
  if (load_font)
    TTF_Quit();
  SDL_DestroyRenderer(renderer);
  SDL_DestroyWindow(window);
  SDL_Quit();
}

V86_API int poll_mouse_x() {
  return last_mouse_move[0];
}

V86_API int poll_key() {
  if (last_keys.empty())
    return -1;
  int result = last_keys.back();
  last_keys.pop_back();
  return result;
}

V86_API int poll_mouse_y() {
  return -last_mouse_move[1];
}

V86_API int poll_mouse_clicks() {
  int result = 0;
  if (button_states[0])
    result |= 2;
  if (button_states[1])
    result |= 4;
  if (button_states[2])
    result |= 8;
  return result;
}

V86_API int poll_wheel() {
  return last_wheel;
}

V86_API int poll_events() {
  int result = 0;
  SDL_Event event;
  while (SDL_PollEvent(&event)) {
    switch (event.type) {
      case SDL_QUIT:
        if (!mouse_locked)
          result |= QUIT;
        break;
      case SDL_MOUSEMOTION:
        if (mouse_locked) {
          last_mouse_move[0] = event.motion.xrel;
          last_mouse_move[1] = event.motion.yrel;
          result |= MOVE;
        }
        break;
      case SDL_MOUSEBUTTONDOWN:
        if (mouse_locked && SDL_BUTTON_RIGHT >= event.button.button >= SDL_BUTTON_LEFT) {
          button_states[event.button.button - 1] = true;
          result |= CLICK;
        }
        break;
      case SDL_MOUSEBUTTONUP:
        if (mouse_locked && SDL_BUTTON_RIGHT >= event.button.button >= SDL_BUTTON_LEFT) {
          button_states[event.button.button - 1] = false;
          result |= CLICK;
        }
        else {
          mouse_locked = true;
          SDL_SetRelativeMouseMode(SDL_TRUE);
          update_title();
        }
        break;
      case SDL_KEYDOWN:
        if (mouse_locked) {
          if (event.key.keysym.sym == SDLK_ESCAPE)
            break;
          last_keys.push_back(sdl_keysym_to_scancode(event.key.keysym.sym));
          result |= KEY;
        }
        else if (event.key.keysym.sym == SDLK_ESCAPE) {
          last_keys.push_back(0x01);
          result |= KEY;
        }
        break;
      case SDL_KEYUP:
        if (mouse_locked) {
          if (event.key.keysym.sym == SDLK_ESCAPE) {
            mouse_locked = false;
            SDL_SetRelativeMouseMode(SDL_FALSE);
            update_title();
            break;
          }
          last_keys.push_back(sdl_keysym_to_scancode(event.key.keysym.sym) | 0x80);
          result |= KEY;
          break;
        }
        else if (event.key.keysym.sym == SDLK_ESCAPE) {
          last_keys.push_back(0x01 | 0x80);
          result |= KEY;
        }
        else if (event.key.keysym.sym == SDLK_F1) {
          result |= SAVE_STATE;
        }
        else if (event.key.keysym.sym == SDLK_F2) {
          result |= LOAD_STATE;
        }
        else if (event.key.keysym.sym == SDLK_F3) {
          result |= CTRL_ALT_DEL;
        }
      case SDL_MOUSEWHEEL:
        if (mouse_locked) {
          last_wheel = event.wheel.y;
          result |= WHEEL;
        }
        break;
    }
  }
  return result;
}

V86_API void init(
  int _char_size_x,
  int _char_size_y,
  int _font_size,
  bool _vsync,
  bool _hardware_accel,
  bool _anti_aliassing,
  bool _load_font,
  char* _font_path
) {
  char_size[0] = _char_size_x;
  char_size[1] = _char_size_y;
  screen_size_text[0] = char_count[0] * char_size[0];
  screen_size_text[1] = char_count[1] * char_size[1];
  font_size = _font_size;
  anti_aliassing = _anti_aliassing;
  SDL_Init(SDL_INIT_VIDEO);
  if (_load_font) {
    TTF_Init();
    font = TTF_OpenFont(_font_path, font_size);
    load_font = true;
  }
  SDL_WindowFlags window_flags = SDL_WINDOW_ALLOW_HIGHDPI;
  Uint32 renderer_flags = 0;
  if (_vsync) renderer_flags |= SDL_RENDERER_PRESENTVSYNC;
  if (_hardware_accel) renderer_flags |= SDL_RENDERER_ACCELERATED;
  window = SDL_CreateWindow(
    "nodev86",
    SDL_WINDOWPOS_CENTERED,
    SDL_WINDOWPOS_CENTERED,
    screen_size_text[0],
    screen_size_text[1],
    window_flags
  );
  #ifdef WIN32_DARK_THEME
    SDL_SysWMinfo wmi;
    SDL_VERSION(&wmi.version);
    SDL_GetWindowWMInfo(window, &wmi);
    HWND hwnd = wmi.info.win.window;
    BOOL dark_mode = 1;
    DwmSetWindowAttribute(hwnd, 20, &dark_mode, sizeof dark_mode);
  #endif
  renderer = SDL_CreateRenderer(
    window,
    -1,
    renderer_flags
  );
  update_title();
}

V86_API void set_loading(bool _is_loading) {
  is_loading = _is_loading;
  update_title();
}

V86_API void flip_screen() {
  SDL_RenderPresent(renderer);
}

V86_API void clear_screen() {
  SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
  SDL_RenderClear(renderer);
}

V86_API void set_graphical(bool _is_graphical) {
  is_graphical = _is_graphical;
  update_should_center();
  if (is_graphical)
    SDL_SetWindowSize(window, screen_size_graphical[0], screen_size_graphical[1]);
  else
    SDL_SetWindowSize(window, screen_size_text[0], screen_size_text[1]);
  update_center();
  update_title();
}

V86_API void set_size_text(int _x_chars, int _y_chars) {
  char_count[0] = _x_chars;
  char_count[1] = _y_chars;
  screen_size_text[0] = _x_chars * char_size[0];
  screen_size_text[1] = _y_chars * char_size[1];
  if (!is_graphical) {
    update_should_center();
    SDL_SetWindowSize(window, screen_size_text[0], screen_size_text[1]);
    update_center();
  }
  update_title();
}

V86_API void set_size_graphical(int _width, int _height) {
  screen_size_graphical[0] = _width;
  screen_size_graphical[1] = _height;
  if (is_graphical) {
    update_should_center();
    SDL_SetWindowSize(window, screen_size_graphical[0], screen_size_graphical[1]);
    update_center();
  }
  update_title();
}

V86_API void screen_draw_cursor(int _x, int _y, int _h, uint8_t* _bg) {
  SDL_Rect _rect = {
    _x * char_size[0],
    _y * char_size[1] - _h,
    char_size[0],
    _h
  };
  SDL_SetRenderDrawColor(renderer, _bg[0], _bg[1], _bg[2], 255);
  SDL_RenderFillRect(renderer, &_rect);
}

V86_API void screen_put_char(int _x, int _y, int _w, char* _char, uint8_t* _bg, uint8_t* _fg) {
  SDL_Rect _rect = {
    _x * char_size[0],
    _y * char_size[1],
    char_size[0] * _w,
    char_size[1]
  };
  SDL_SetRenderDrawColor(renderer, _bg[0], _bg[1], _bg[2], 255);
  SDL_RenderFillRect(renderer, &_rect);
  if (!_char || !font) {
    // cout << "passed null" << endl;
    return;
  }
  SDL_Surface* _surf = (anti_aliassing ? TTF_RenderUTF8_Blended : TTF_RenderUTF8_Solid)(
    font,
    _char,
    { _fg[0], _fg[1], _fg[2] }
  );
  SDL_Texture* _tex = SDL_CreateTextureFromSurface(renderer, _surf);
  SDL_FreeSurface(_surf);
  SDL_RenderCopy(renderer, _tex, NULL, &_rect);
  SDL_DestroyTexture(_tex);
}

V86_API void screen_graphic_output(void* _data, int _x, int _y/*, int _bx, int _by*/, int _width, int _height) {
  // This code for VBE, VGA has _y = 0
  // Trick is not working with win9x logo
  int _max_y = _y + _height;
  SDL_Rect _src_rect = { 0, 0, _width, _max_y };
  SDL_Rect _dst_rect = { _x, 0, _width, _max_y };
  SDL_Texture* _tex = SDL_CreateTexture(
		renderer,
		SDL_PIXELFORMAT_ABGR8888,
		SDL_TEXTUREACCESS_STREAMING,
		_width,
    _max_y
	);
	SDL_UpdateTexture(_tex, NULL, _data, _width * 4);
	SDL_RenderCopy(
    renderer,
    _tex,
    &_src_rect,
    &_dst_rect
  );
  SDL_SetRenderDrawColor(renderer, 255, 0, 0, 255);
  /*SDL_Rect debug_rect = {
    _bx,
    _by,
    _width,
    _height
  };
  SDL_RenderDrawRect(renderer, &debug_rect);*/
  SDL_DestroyTexture(_tex);
}
