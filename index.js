const {
  ImageData
} = require('canvas');
const {
  dll
} = require('./loader');
const {
  v86_c,
  c
} = require('./config');
const {
  number_as_color,
  charmap,
  closer_color_bg,
  closer_color_fg,
  set_cursor_pos,
  str_to_utf16
} = require('./screen_tools');
const defines = require('./defines');
const v86 = require('./build/libv86');

global.ImageData = ImageData;

const char_size = c['char_size'];
const mouse_sens = c['mouse_sens'];
const text_mode = c['graphic_text_mode'];
const use_console = c['console_text_mode'];
const bright_font = c['font_bright'];
const encoder = new TextEncoder();

var is_graphical = false;
var text_mode_size = [80, 25];
var vga_mode_size = [0, 0];
var cursor_pos = [-1, -1];
var enable_cursor = false;
var changed_rows = new Int8Array(25);
var text_mode_data = new Int32Array(80 * 25 * 3);
var cursor_height = Math.floor(char_size[1] / 16);
var cursor_color = new Uint8Array([0xCC, 0xCC, 0xCC]);

dll.init(
  char_size[0],
  char_size[1],
  c['font_size'],
  c['vsync'],
  c['hardware_accel'],
  c['anti_aliassing'],
  text_mode,
  encoder.encode(c['font_path'])
);

const e = new v86.V86Starter(v86_c);

e.bus.register("screen-clear", function() {
  if (use_console)
    process.stdout.write('\x1b[2J' + set_cursor_pos(cursor_pos[1] + 1, cursor_pos[0] + 1));
  dll.clear_screen();
});
e.bus.register("screen-set-mode", function(data) {
  if (data == is_graphical)
    return;
  is_graphical = data;
  dll.set_graphical(data);
});
e.bus.register("screen-set-size-graphical", function(data) {
  if (vga_mode_size[0] == data[0] && vga_mode_size[1] == data[1])
    return;
  vga_mode_size[0] = data[0];
  vga_mode_size[1] = data[1];
  dll.set_size_graphical(vga_mode_size[0], vga_mode_size[1]);
});
e.bus.register("screen-set-size-text", function(data) {
  if (text_mode_size[0] == data[0] && text_mode_size[1] == data[1])
    return;
  text_mode_size[0] = data[0];
  text_mode_size[1] = data[1];
  changed_rows = new Int8Array(data[1]);
  text_mode_data = new Int32Array(data[0] * data[1] * 3);
  for (var i = 0; i < data[1]; i++) {
    if (use_console) console_text_update_row(i);
    if (text_mode) text_update_row(i);
  }
  dll.set_size_text(text_mode_size[0], text_mode_size[1]);
});
e.bus.register("screen-update-cursor", function(data) {
  if (data[0] == cursor_pos[0] && data[1] == cursor_pos[1]) {
    return;
  }
  if (text_mode) {
    changed_rows[cursor_pos[0]] = true;
    changed_rows[data[0]] = true;
  }
  cursor_pos[0] = data[0];
  cursor_pos[1] = data[1];
  if (use_console)
    process.stdout.write(set_cursor_pos(cursor_pos[1] + 1, cursor_pos[0] + 1));
});
e.bus.register("screen-update-cursor-scanline", function(data) {
  if (data[0] & 0x20) {
    enable_cursor = false;
    if (text_mode) {
      changed_rows[cursor_pos[0]] = true;
      changed_rows[0] = true;
    }
    cursor_pos[0] = -1;
    cursor_pos[1] = -1;
  } else {
    enable_cursor = true;
    cursor_height = Math.floor((data[1] - data[0]) * char_size[1] / 16);
    if (text_mode) {
      changed_rows[cursor_pos[0]] = true;
      changed_rows[0] = true;
    }
  }
});
var skip_space = true;
e.bus.register("screen-put-char", function(data) {
  put_char(data);
});
e.bus.register("screen-fill-buffer-end", function(data) {
  // dll.clear_screen();
  data.forEach(layer => {
    dll.screen_graphic_output(
      layer.image_data.data,
      layer.screen_x,
      layer.screen_y,
      layer.buffer_width,
      layer.buffer_height
    );
  });
  dll.flip_screen();
});

function put_char(data) {
  if (data[0] < text_mode_size[1] && data[1] < text_mode_size[0]) {
    const p = 3 * (data[0] * text_mode_size[0] + data[1]);

    text_mode_data[p] = data[2];
    text_mode_data[p + 1] = data[3];
    text_mode_data[p + 2] = data[4];

    changed_rows[data[0]] = 1;
  }
}

function console_text_update_row(row) {
  var offset = 3 * row * text_mode_size[0];

  var bg_color,
    fg_color,
    text = set_cursor_pos(0, row + 1);
  if (bright_font)
    text += '\x1b[1m';

  for (var i = 0; i < text_mode_size[0];) {
    bg_color = text_mode_data[offset + 1];
    fg_color = text_mode_data[offset + 2];
    text += closer_color_bg(number_as_color(bg_color));
    text += closer_color_fg(number_as_color(fg_color));

    while (i < text_mode_size[0] &&
      text_mode_data[offset + 1] === bg_color &&
      text_mode_data[offset + 2] === fg_color) {

      text += charmap[text_mode_data[offset]];

      i++;
      offset += 3;
    }
    closer_color_bg(number_as_color(bg_color));
  }
  text += set_cursor_pos(cursor_pos[1] + 1, cursor_pos[0] + 1);
  process.stdout.write(text);
};

function text_update_row(row) {
  var offset = 3 * row * text_mode_size[0];

  var bg_color,
    fg_color,
    text;

  for (var i = 0; i < text_mode_size[0];) {
    bg_color = text_mode_data[offset + 1];
    fg_color = text_mode_data[offset + 2];

    text = "";

    while (i < text_mode_size[0] &&
      text_mode_data[offset + 1] == bg_color &&
      text_mode_data[offset + 2] == fg_color) {
      var ascii = text_mode_data[offset];

      text += charmap[ascii];

      i++;
      offset += 3;
    }

    dll.screen_put_char(
      i - text.length,
      row,
      text.length,
      str_to_utf16(text + '\x00'),
      new Uint8Array(number_as_color(bg_color)),
      new Uint8Array(number_as_color(fg_color))
    );
  }
}

function update_text_rows() {
  for (var i = 0; i < text_mode_size[1]; i++) {
    if (changed_rows[i]) {
      if (use_console) console_text_update_row(i);
      if (text_mode) {
        text_update_row(i);
        if (enable_cursor && i == cursor_pos[0]) {
          dll.screen_draw_cursor(
            cursor_pos[1],
            cursor_pos[0] + 1,
            cursor_height,
            cursor_color
          );
        }
      }
      changed_rows[i] = 0;
    }
  }
}

function update_text() {
  update_text_rows();
  dll.flip_screen();
  tick();
}

function update_graphical() {
  e.bus.send("screen-fill-buffer");
  tick();
}

function tick() {
  const sum = dll.poll_events();
  if (sum & defines.MOVE) {
    e.bus.send("mouse-delta", [dll.poll_mouse_x() * mouse_sens, dll.poll_mouse_y() * mouse_sens]);
  }
  if (sum & defines.KEY) {
    var key = dll.poll_key();
    while (key !== -1) {
      if (key)
        e.bus.send("keyboard-code", key);
      key = dll.poll_key();
    }
  }
  if (sum & defines.CLICK) {
    const clicks = dll.poll_mouse_clicks();
    e.bus.send("mouse-click", [(clicks & 2) !== 0, (clicks & 4) !== 0, (clicks & 8) !== 0]);
  }
  if (sum & defines.WHEEL) {
    e.bus.send("mouse-wheel", [dll.poll_wheel(), 0]);
  }
  if (sum & defines.QUIT) {
    e.destroy();
    dll.destroy();
    return;
  }
  setImmediate(is_graphical ? update_graphical : update_text);
}

dll.clear_screen();
tick();
