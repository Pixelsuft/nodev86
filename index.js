const {
  ImageData
} = require('canvas');
const {
  dll
} = require('./loader');
const {
  v86_c,
  c
} = require(
  process.argv.length > 2 ?
  './configs/' + process.argv[2] :
  './default_config'
);
const {
  number_as_color,
  closer_color_bg,
  closer_color_fg,
  set_cursor_pos,
  str_to_utf16,
  update_charmap
} = require('./screen_tools');
const {
  SpeakerAdapter
} = require('./speaker');
const {
  ACPI
} = require('./acpi');
const {
  RTC
} = require('./rtc');
const AudioContext = require('web-audio-engine').StreamAudioContext;
const Speaker = require('speaker');
const fs = require('fs');
const path = require('path');
const defines = require('./defines');
const custom_charmap = require('./charmaps/' + (c['charmap'] || 'default'));
const {
  performance
} = require('perf_hooks');
if (!c['disable_microtick_hook']) {
  performance.now.bind = function() {
    return function() {
      return dll.microtick() / 1000;
    };
  }
}
if (!c['disable_now_hook']) {
  Date.now = dll.get_now;
}
const v86 = require('./build/libv86');

// Tricky fixed TODO
global.ImageData = ImageData;
if (c['speaker']) {
  global.AudioContext = AudioContext;
  global.OutputSpeaker = Speaker;
}

const char_size = c['char_size'];
const mouse_sens = c['mouse_sens'];
const text_mode = c['graphic_text_mode'];
const use_console = c['console_text_mode'];
const use_serial = c['console_serial_mode'];
const charmap = update_charmap(custom_charmap.high, custom_charmap.low);
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
  encoder.encode(c['font_path'] + '\x00')
);

const e = new v86.V86Starter(v86_c);

e.bus.register("emulator-ready", function() {
  if (c['custom_acpi']) {
    e.v86.cpu.devices.acpi = new ACPI(e.v86.cpu);
  }
  if (c['custom_rtc']) {
    e.v86.cpu.devices.rtc = new RTC(e.v86.cpu);
    e.v86.cpu.fill_cmos(e.v86.cpu.devices.rtc, v86_c);
  }
  if (c['speaker'])
    new SpeakerAdapter(e.bus);
  if (!v86_c['autostart'])
    e.bus.send("cpu-run");
});
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
      /*layer.buffer_x,
      layer.buffer_y,*/
      layer.buffer_width,
      layer.buffer_height
    );
  });
  dll.flip_screen();
});
e.add_listener("ide-read-start", function() {
  dll.set_loading(true);
});
e.add_listener("ide-read-end", function() {
  dll.set_loading(false);
});
if (use_serial) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  e.bus.register("serial0-output-char", function(chr) {
    process.stdout.write(chr);
  });
  process.stdin.on("data", function(c) {
    e.bus.send("serial0-input", c);
  });
}

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
    temp_fg,
    text = set_cursor_pos(0, row + 1);

  for (var i = 0; i < text_mode_size[0];) {
    bg_color = text_mode_data[offset + 1];
    fg_color = text_mode_data[offset + 2];
    temp_fg = number_as_color(fg_color);
    text += (temp_fg[0] > 170 || temp_fg[1] > 170 || temp_fg[2] > 170) ? '\x1b[1m' : '\x1b[0m';
    text += closer_color_bg(number_as_color(bg_color));
    text += closer_color_fg(temp_fg);

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

function keyboard_send_scancodes(codes) {
  for (var i = 0; i < codes.length; i++) {
    e.bus.send("keyboard-code", codes[i]);
  }
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
    if (use_serial) process.stdin.pause();
    e.destroy();
    dll.destroy();
    return;
  }
  if (sum & defines.CTRL_ALT_DEL) {
    keyboard_send_scancodes([
      0x1D, // ctrl
      0x38, // alt
      0x53, // delete

      // break codes
      0x1D | 0x80,
      0x38 | 0x80,
      0x53 | 0x80,
    ]);
  }
  if (sum & defines.SAVE_STATE) {
    e.save_state(async function(err, s) {
      if (err)
        throw err;
      const blob = new Blob([s], {
        type: 'application/octet-stream'
      });
      const buffer = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(
        path.join(__dirname, 'states', (process.argv.length > 2 ? process.argv[2] : 'default') + '.bin'),
        buffer,
        'binary'
      );
    });
  }
  if (sum & defines.LOAD_STATE) {
    e.restore_state(fs.readFileSync(
      path.join(__dirname, 'states', (process.argv.length > 2 ? process.argv[2] : 'default') + '.bin'),
      'utf8',
      'binary'
    ));
  }
  setImmediate(is_graphical ? update_graphical : update_text);
}

dll.clear_screen();
tick();
