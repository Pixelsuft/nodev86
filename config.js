const v86_config = {
  wasm_path: "./build/v86.wasm",
  memory_size: 16 * 1024 * 1024,
  vga_memory_size: 4 * 1024 * 1024,
  bios: {
    url: "./bios/bochs-bios.bin",
  },
  vga_bios: {
    url: "./bios/bochs-vgabios.bin",
  },
  hda: {
    //url: "d:/freebsd.img",
    //async: true,
    url: "d:/msdos.img",
    //url: "d:/copy_winnt.img",
    //url: "d:/windows31.img",
  },
  fda: {
    //url: "d:/images/kolibri.img",
  },
  cdrom: {
    //url: "d:/Images/kolibri.iso"
  },
  acpi: false,  // Set true for Windows 7
  autostart: true,
  boot_order: 0x132
};

const config = {
  'hardware_accel': true,
  'char_size': [9, 16],
  'font_size': 15,
  'font_bright': process.platform == 'win32',
  'anti_aliassing': true,
  'mouse_sens': 0.15 * 2,
  'font_path': 'fonts/ascii.ttf',
  'graphic_text_mode': true,
  'console_text_mode': true  // Better???
};

// TODO: Parse Configs

exports.v86_c = v86_config;
exports.c = config;
