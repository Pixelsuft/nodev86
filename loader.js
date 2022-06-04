const path = require('path');
const ffi = require('ffi-napi');


const file_ext = process.platform == 'win32' ? 'dll' : 'so';
if (process.platform == 'win32') {
  ffi.Library(path.join(__dirname, 'external', 'SDL2.' + file_ext));
  ffi.Library(path.join(__dirname, 'external', 'SDL2_ttf.' + file_ext));
}
const dll = ffi.Library(
  path.join(__dirname, 'external', 'nodev86.' + file_ext), {
    'init': ['void', ['int', 'int', 'int', 'bool', 'bool', 'bool', 'bool', 'char*']],
    'destroy': ['void', []],
    'flip_screen': ['void', []],
    'clear_screen': ['void', []],
    'poll_mouse_x': ['int', []],
    'poll_mouse_y': ['int', []],
    'poll_mouse_clicks': ['int', []],
    'poll_key': ['int', []],
    'poll_wheel': ['int', []],
    'set_loading': ['void', ['bool']],
    'set_graphical': ['void', ['bool']],
    'set_size_graphical': ['void', ['int', 'int']],
    'screen_draw_cursor': ['void', ['int', 'int', 'int', 'Uint8*']],
    'screen_put_char': ['void', ['int', 'int', 'int', 'Uint16*', 'Uint8*', 'Uint8*']],
    'screen_graphic_output': ['void', ['char*', 'int', 'int', 'int', 'int']],
    'set_size_text': ['void', ['int', 'int']],
    'poll_events': ['int', []]
  }
);


exports.dll = dll;
