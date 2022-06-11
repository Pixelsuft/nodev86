const {
  dll
} = require('./loader');

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

  io.register_read(0xB000, this, undefined, function() {
    return dll.acpi_read16(0xB000);
  });
  io.register_read(0xB002, this, undefined, function() {
    return dll.acpi_read16(0xB002);
  });
  io.register_read(0xB004, this, undefined, function() {
    return dll.acpi_read16(0xB004);
  });
  io.register_write(0xB000, this, undefined, function(value) {
    dll.acpi_write16(0xB000, value);
  });
  io.register_write(0xB002, this, undefined, function(value) {
    dll.acpi_write16(0xB002, value);
  });
  io.register_write(0xB004, this, undefined, function(value) {
    dll.acpi_write16(0xB004, value);
  });

  io.register_read(0xAFE0, this, function() {
    return dll.acpi_read8(0xAFE0);
  });
  io.register_read(0xAFE1, this, function() {
    return dll.acpi_read8(0xAFE1);
  });
  io.register_read(0xAFE2, this, function() {
    return dll.acpi_read8(0xAFE2);
  });
  io.register_read(0xAFE3, this, function() {
    return dll.acpi_read8(0xAFE3);
  });
  io.register_write(0xAFE0, this, function(value) {
    dll.acpi_write8(0xAFE0, value);
  });
  io.register_write(0xAFE1, this, function(value) {
    dll.acpi_write8(0xAFE1, value);
  });
  io.register_write(0xAFE2, this, function(value) {
    dll.acpi_write8(0xAFE2, value);
  });
  io.register_write(0xAFE3, this, function(value) {
    dll.acpi_write8(0xAFE3, value);
  });

  io.register_read(0xB008, this, undefined, undefined, function() {
    return dll.acpi_read32(0xB008);
  });
}

ACPI.prototype.timer = function(now) {
  if (dll.acpi_timer(now))
    this.cpu.device_lower_irq(9)
  else
    this.cpu.device_raise_irq(9);
  return dll.acpi_get_result();
};

ACPI.prototype.get_timer = dll.acpi_get_timer;

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
