#include <SDL2/SDL_keycode.h>


static int sdl_keysym_to_scancode(int sym)  // Thanks halfix
{
    int n;
    switch (sym) {
    case SDLK_0 ... SDLK_9:
        n = sym - SDLK_0;
        if (!n)
            n = 10;
        return n + 1;
    case SDLK_ESCAPE:
        return 0x01;
    case SDLK_EQUALS:
        return 0x0D;
    case SDLK_RETURN:
        return 0x1C;
    case SDLK_a:
        return 0x1E;
    case SDLK_b:
        return 0x30;
    case SDLK_c:
        return 0x2E;
    case SDLK_d:
        return 0x20;
    case SDLK_e:
        return 0x12;
    case SDLK_f:
        return 0x21;
    case SDLK_g:
        return 0x22;
    case SDLK_h:
        return 0x23;
    case SDLK_i:
        return 0x17;
    case SDLK_j:
        return 0x24;
    case SDLK_k:
        return 0x25;
    case SDLK_l:
        return 0x26;
    case SDLK_m:
        return 0x32;
    case SDLK_n:
        return 0x31;
    case SDLK_o:
        return 0x18;
    case SDLK_p:
        return 0x19;
    case SDLK_q:
        return 0x10;
    case SDLK_r:
        return 0x13;
    case SDLK_s:
        return 0x1F;
    case SDLK_t:
        return 0x14;
    case SDLK_u:
        return 0x16;
    case SDLK_v:
        return 0x2F;
    case SDLK_w:
        return 0x11;
    case SDLK_x:
        return 0x2D;
    case SDLK_y:
        return 0x15;
    case SDLK_z:
        return 0x2C;
    case SDLK_BACKSPACE:
        return 0x0E;
    case SDLK_LEFT:
        return 0xE04B;
    case SDLK_DOWN:
        return 0xE050;
    case SDLK_RIGHT:
        return 0xE04D;
    case SDLK_UP:
        return 0xE048;
    case SDLK_SPACE:
        return 0x39;
    case SDLK_PAGEUP:
        return 0xE04F;
    case SDLK_PAGEDOWN:
        return 0xE051;
    case SDLK_DELETE:
        return 0xE053;
    case SDLK_F1 ... SDLK_F12:
        return 0x3B + (sym - SDLK_F1);
    case SDLK_SLASH:
        return 0x35;
    case SDLK_LALT:
        return 0x38;
    case SDLK_LCTRL:
        return 0x1D;
    case SDLK_LSHIFT:
        return 0x2A;
    case SDLK_RSHIFT:
        return 0x36;
    case SDLK_SEMICOLON:
        return 0x27;
    case SDLK_BACKSLASH:
        return 0x2B;
    case SDLK_COMMA:
        return 0x33;
    case SDLK_PERIOD:
        return 0x34;
    case SDLK_MINUS:
        return 0x0C;
    case SDLK_RIGHTBRACKET:
        return 0x1A;
    case SDLK_LEFTBRACKET:
        return 0x1B;
    case SDLK_QUOTE:
        return 0x28;
    case SDLK_BACKQUOTE:
        return 0x29;
    case SDLK_TAB:
        return 0x0F;
    case 311: // Left Win
        return 0xE05B;
    case 312: // Right Win
        return 0xE05B;
    default:
        return 0x00;
    }
}
