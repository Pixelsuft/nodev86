const path = require('path');
const ffi = require('ffi-napi');


const file_ext = process.platform == 'win32' ? 'dll' : 'so';
if (process.platform == 'win32') {
  ffi.Library(path.join(__dirname, 'external', 'SDL2.' + file_ext));
  ffi.Library(path.join(__dirname, 'external', 'SDL2_ttf.' + file_ext));
}
const dll = ffi.Library(
  path.join(__dirname, 'external', 'nodev86.' + file_ext), {
    // Base
    'init': ['void', ['int', 'int', 'int', 'bool', 'bool', 'bool', 'bool', 'char*']],
    'destroy': ['void', []],
    'flip_screen': ['void', []],
    'clear_screen': ['void', []],
    'microtick': ['Uint64', []],
    'get_now': ['Uint64', []],
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
    'screen_graphic_output': ['void', ['char*', 'int', 'int'/*, 'int', 'int'*/, 'int', 'int']],
    'set_size_text': ['void', ['int', 'int']],
    'poll_events': ['int', []],
    // ACPI
    'acpi_microtick': ['Uint64', []],
    'acpi_read8': ['Uint8', ['Uint32']],
    'acpi_read16': ['Uint16', ['Uint32']],
    'acpi_read32': ['Uint32', ['Uint32']],
    'acpi_write8': ['void', ['Uint32', 'Uint8']],
    'acpi_write16': ['void', ['Uint32', 'Uint16']],
    'acpi_get_timer': ['Uint32', ['Uint64']],
    'acpi_timer': ['bool', ['Uint64']],
    'acpi_get_result': ['int', []],
    'acpi_get_state': ['Uint16*', []],
    'acpi_set_state': ['void', ['Uint16*']],
    // RTC
    'cmos_init': ['void', ['Uint64']],
    'cmos_get_now': ['Uint64', []],
    'cmos_ram_read': ['Uint8', ['Uint8']],
    'cmos_readb_70': ['Uint32', []],
    'cmos_readb_71': ['Uint32', []],
    'cmos_update_timer': ['void', []],
    'cmos_ram_write': ['void', ['Uint8']],
    'cmos_writeb_70': ['void', ['Uint32']],
    'cmos_writeb_71': ['void', ['Uint32']],
    'cmos_next': ['int', ['Uint64']],
    'cmos_set': ['void', ['Uint8', 'Uint8']],
    'cmos_get': ['Uint8', ['Uint8']],
    'cmos_should_lower': ['bool', []],
    'cmos_get_raise': ['int', []]
  }
);


exports.dll = dll;
