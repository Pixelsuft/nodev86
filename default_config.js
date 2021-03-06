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
    //async: true, // For larger images
    //url: "d:/msdos.img",
    //url: "d:/copy_winnt.img",
    //url: "d:/windows31.img",
    //url: "d:/windows95.img", // Not works with bochs bios
  },
  cdrom: {
    //url: "d:/Images/kolibri.iso" // Not works with bochs bios
  },
  network_relay_url: "wss://relay.widgetry.org/",
  acpi: false, // Set true for Windows 7
  autostart: false,
  boot_order: 0x132
};

const config = {
  'hardware_accel': true,
  'lib_file': 'libv86',
  'legacy_vga': false,
  'vsync': true,
  'mouse_sens': 0.15 * 2,
  'speaker': true, // A little bit laggy
  'custom_rtc': false, // Will require patch to pass custom RTC as default
  'custom_acpi': false, // Requires default ACPI, works bad with Windows 7
  'custom_acpi_accurate': false,
  'disable_microtick_hook': false, // Set true if win 7 logo doesn't appear
  'disable_now_hook': false, // Set true if win 7 logo doesn't appear
  'char_size': [9, 16],
  'font_size': 15,
  'charmap': 'default',
  'anti_aliassing': true,
  'font_path': 'fonts/liberationmonob.ttf', // ascii.ttf not works with unicode
  'graphic_text_mode': true,
  'console_text_mode': true,
  'console_serial_mode': false
};

exports.v86_c = v86_config;
exports.c = config;
