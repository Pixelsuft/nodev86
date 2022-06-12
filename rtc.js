const {
  dll
} = require('./loader');

function RTC(cpu) {
  this.cpu = cpu;

  cpu.io.register_read(0x70, this, dll.cmos_readb_70);
  cpu.io.register_read(0x71, this, function() {
    if (dll.cmos_should_lower())
      this.cpu.device_lower_irq(8);
    return dll.cmos_readb_71();
  });

  cpu.io.register_write(0x70, this, dll.cmos_writeb_70);
  cpu.io.register_write(0x71, this, dll.cmos_writeb_71);

  dll.cmos_init(0);
}

RTC.prototype.get_state = function() {
  // TODO
  var state = [];

  return state;
};

RTC.prototype.set_state = function(state) {
  // TODO
};

RTC.prototype.timer = function(time, legacy_mode) {
  const result = dll.cmos_next(dll.cmos_get_now());
  const to_raise = dll.cmos_get_raise();
  if (to_raise) {
    this.cpu.device_raise_irq(8);
  }
  return result;
};

RTC.prototype.cmos_read = dll.cmos_get;

RTC.prototype.cmos_write = dll.cmos_set;


exports.RTC = RTC;
