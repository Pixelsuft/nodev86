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
  charmap
} = require('./screen_tools');
const defines = require('./defines');
const v86 = require('./build/libv86');

global.ImageData = ImageData;

var is_graphical = false;
var text_mode_size = [80, 25];
var last_cursor = [0, 0, 32, 0, 0];
var vga_mode_size = [0, 0];
var cursor_pos = [0, 0];
var enable_cursor = false;
const mouse_sens = c['mouse_sens'];
const disable_text_mode = c['disable_text_mode'];
const encoder = new TextEncoder();

dll.init(
  c['char_size'][0],
  c['char_size'][1],
  c['font_size'],
  c['vsync'],
  c['hardware_accel'],
  c['anti_aliassing'],
  encoder.encode(c['font_path'])
);

const e = new v86.V86Starter(v86_c);

e.bus.register("screen-clear", function() {
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
  dll.set_size_text(text_mode_size[0], text_mode_size[1]);
});
e.bus.register("screen-update-cursor", function(data) {
  // TODO: Make Better
  cursor_pos[0] = data[0];
  cursor_pos[1] = data[1];
});
e.bus.register("screen-update-cursor-scanline", function(data) {
  // TODO: Make Better
  if (data[0] & 0x20) {
    cursor_pos[0] = 0;
    cursor_pos[1] = 0;
    dll.screen_put_char(
      last_cursor[1],
      last_cursor[0],
      last_cursor[2],
      new Uint8Array(number_as_color(last_cursor[3])),
      new Uint8Array(number_as_color(last_cursor[4]))
    );
    enable_cursor = false;
  }
  else {
    enable_cursor = true;
  }
});
var skip_space = true;
e.bus.register("screen-put-char", function(data) {
  // TODO: Do something with that
  if (disable_text_mode || (skip_space && data[2] == ' ')) // Temporary, we need to use changed_rows instead of this
    return;
  skip_space = false;
  if (enable_cursor && data[0] == cursor_pos[0] && data[1] == cursor_pos[1]) {
    dll.screen_put_char(
      last_cursor[1],
      last_cursor[0],
      last_cursor[2],
      new Uint8Array(number_as_color(last_cursor[3])),
      new Uint8Array(number_as_color(last_cursor[4]))
    );
    dll.screen_put_char(
      data[1],
      data[0],
      data[2],
      new Uint8Array(number_as_color(data[4])),
      new Uint8Array(number_as_color(data[3]))
    );
    last_cursor[0] = data[0];
    last_cursor[1] = data[1];
    last_cursor[2] = data[2];
    last_cursor[3] = data[3];
    last_cursor[4] = data[4];
    return;
  }
  dll.screen_put_char(
    data[1],
    data[0],
    data[2],
    new Uint8Array(number_as_color(data[3])),
    new Uint8Array(number_as_color(data[4]))
  );
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

function update_text() {
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
