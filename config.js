const v86_config = {
  wasm_path: "./build/v86.wasm",
  memory_size: 16 * 1024 * 1024,
  vga_memory_size: 4 * 1024 * 1024,
  bios: {
    url: "./bios/seabios.bin",
  },
  vga_bios: {
    url: "./bios/vgabios.bin",
  },
  hda: {
    //url: "d:/freebsd.img",
    //async: true,
    //url: "d:/dos.img",
    //url: "d:/copy_winnt.img",
    url: "d:/windows31.img",
  },
  fda: {
    //url: "d:/images/kolibri.img",
  },
  autostart: true,
};

const config = {
  'hardware_accel': true,
  'char_size': [9 * 2, 16 * 2],
  'font_size': 15 * 2,
  'anti_aliassing': true,
  'mouse_sens': 0.15 * 2,
  'font_path': 'fonts/ascii.ttf',  // courbd not works, why??
  'disable_text_mode': false  // Perfomance, it's really bad now
};

// TODO: Parse Configs

exports.v86_c = v86_config;
exports.c = config;
