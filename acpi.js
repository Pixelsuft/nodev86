const {
  dll
} = require('./loader');

const PMTIMER_FREQ_SECONDS = 3579545;

function ACPI(cpu) {
  this.cpu = cpu;

  var io = cpu.io;

  var acpi = {
    pci_id: 0x07 << 3,
    pci_space: [
      0x86, 0x80, 0x13, 0x71, 0x07, 0x00, 0x80, 0x02, 0x08, 0x00, 0x80, 0x06, 0x00, 0x00, 0x80, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0x01, 0x00, 0x00,
    ],
    pci_bars: [],
    name: "acpi",
  };

  cpu.devices.pci.register_device(acpi);

  const read8 = [0xAFE0, 0xAFE1, 0xAFE2, 0xAFE3];
  const read16 = [0xB000, 0xB002, 0xB004];
  const write8 = [0xAFE0, 0xAFE1, 0xAFE2, 0xAFE3];
  const write16 = [0xB000, 0xB002, 0xB004];

  for (var _i = 0; _i < read8.length; _i++) {
    const i = read8[_i];
    io.register_read(i, this, function() {
      return dll.acpi_read8(i);
    });
  }
  for (var _i = 0; _i < read16.length; _i++) {
    const i = read16[_i];
    io.register_read(i, this, undefined, function() {
      return dll.acpi_read16(i);
    });
  }
  for (var _i = 0; _i < write8.length; _i++) {
    const i = write8[_i];
    io.register_write(i, this, function(value) {
      dll.acpi_write8(i, value);
    });
  }
  for (var _i = 0; _i < write16.length; _i++) {
    const i = write16[_i];
    io.register_write(i, this, undefined, function(value) {
      dll.acpi_write16(i, value);
    });
  }
  io.register_read(0xB008, this, undefined, undefined, function() {
    return dll.acpi_read32(0xB008);
  });
  /*io.register_read(0xB008, this, undefined, undefined, function() {
    const result = dll.acpi_read32(0xB008);
    console.log(result);
    return result;
  });*/
}

ACPI.prototype.timer = function(now) {
  if (dll.acpi_timer(now))
    this.cpu.device_lower_irq(9)
  else
    this.cpu.device_raise_irq(9);
  return dll.acpi_get_result();
  // return 100;
};

ACPI.prototype.get_state = function() {
  var state = [];
  /*state[0] = this.status;
  state[1] = this.pm1_status;
  state[2] = this.pm1_enable;
  state[3] = this.gpe;*/
  return state;
};

ACPI.prototype.set_state = function(state) {
  /*this.status = state[0];
  this.pm1_status = state[1];
  this.pm1_enable = state[2];
  this.gpe = state[3];*/
};


exports.ACPI = ACPI;
