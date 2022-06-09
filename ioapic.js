/** @const */
var IOAPIC_ADDRESS = 0xFEC00000;

/** @const */
var IOREGSEL = 0;

/** @const */
var IOWIN = 0x10;

/** @const */
var IOAPIC_IRQ_COUNT = 24;

/** @const */
var IOAPIC_ID = 0; // must match value in seabios


/** @const */
var IOAPIC_CONFIG_TRIGGER_MODE_LEVEL = 1 << 15;

/** @const */
var IOAPIC_CONFIG_MASKED = 1 << 16;

/** @const */
var IOAPIC_CONFIG_DELIVS = 1 << 12;

/** @const */
var IOAPIC_CONFIG_REMOTE_IRR = 1 << 14;

/** @const */
var IOAPIC_CONFIG_READONLY_MASK = IOAPIC_CONFIG_REMOTE_IRR | IOAPIC_CONFIG_DELIVS | 0xFFFE0000;

/** @const */
var IOAPIC_DELIVERY_FIXED = 0;

/** @const */
var IOAPIC_DELIVERY_LOWEST_PRIORITY = 1;

/** @const */
var IOAPIC_DELIVERY_NMI = 4;

/** @const */
var IOAPIC_DELIVERY_INIT = 5;


/**
 * @constructor
 * @param {CPU} cpu
 */
function IOAPIC(cpu) {
  /** @type {CPU} */
  this.cpu = cpu;

  this.ioredtbl_config = new Int32Array(IOAPIC_IRQ_COUNT);
  this.ioredtbl_destination = new Int32Array(IOAPIC_IRQ_COUNT);

  for (var i = 0; i < this.ioredtbl_config.length; i++) {
    // disable interrupts
    this.ioredtbl_config[i] = IOAPIC_CONFIG_MASKED;
  }

  // IOAPIC register selection
  this.ioregsel = 0;

  this.ioapic_id = IOAPIC_ID;

  this.irr = 0;
  this.irq_value = 0;

  cpu.io.mmap_register(IOAPIC_ADDRESS, 1 << 17,
    (addr) => {
      addr = addr - IOAPIC_ADDRESS | 0;

      if (addr >= IOWIN && addr < IOWIN + 4) {
        const byte = addr - IOWIN;
        return this.read(this.ioregsel) >> (8 * byte) & 0xFF;
      } else {
        return 0;
      }
    },
    (addr, value) => {},
    (addr) => {
      addr = addr - IOAPIC_ADDRESS | 0;

      if (addr === IOREGSEL) {
        return this.ioregsel;
      } else if (addr === IOWIN) {
        return this.read(this.ioregsel);
      } else {
        return 0;
      }
    },
    (addr, value) => {
      addr = addr - IOAPIC_ADDRESS | 0;

      if (addr === IOREGSEL) {
        this.ioregsel = value;
      } else if (addr === IOWIN) {
        this.write(this.ioregsel, value);
      } else {}
    });
}

IOAPIC.prototype.remote_eoi = function(vector) {
  for (var i = 0; i < IOAPIC_IRQ_COUNT; i++) {
    var config = this.ioredtbl_config[i];

    if ((config & 0xFF) === vector && (config & IOAPIC_CONFIG_REMOTE_IRR)) {
      this.ioredtbl_config[i] &= ~IOAPIC_CONFIG_REMOTE_IRR;
      this.check_irq(i);
    }
  }
};

IOAPIC.prototype.check_irq = function(irq) {
  var mask = 1 << irq;

  if ((this.irr & mask) === 0) {
    return;
  }

  var config = this.ioredtbl_config[irq];

  if ((config & IOAPIC_CONFIG_MASKED) === 0) {
    var delivery_mode = config >> 8 & 7;
    var destination_mode = config >> 11 & 1;
    var vector = config & 0xFF;
    var destination = this.ioredtbl_destination[irq] >>> 24;
    var is_level = (config & IOAPIC_CONFIG_TRIGGER_MODE_LEVEL) === IOAPIC_CONFIG_TRIGGER_MODE_LEVEL;

    if ((config & IOAPIC_CONFIG_TRIGGER_MODE_LEVEL) === 0) {
      this.irr &= ~mask;
    } else {
      this.ioredtbl_config[irq] |= IOAPIC_CONFIG_REMOTE_IRR;

      if (config & IOAPIC_CONFIG_REMOTE_IRR) {
        return;
      }
    }

    if (delivery_mode === IOAPIC_DELIVERY_FIXED || delivery_mode === IOAPIC_DELIVERY_LOWEST_PRIORITY) {
      this.cpu.devices.apic.route(vector, delivery_mode, is_level, destination, destination_mode);
    } else {}

    this.ioredtbl_config[irq] &= ~IOAPIC_CONFIG_DELIVS;
  }
};

IOAPIC.prototype.set_irq = function(i) {
  if (i >= IOAPIC_IRQ_COUNT) {
    return;
  }

  var mask = 1 << i;

  if ((this.irq_value & mask) === 0) {
    this.irq_value |= mask;

    var config = this.ioredtbl_config[i];
    if ((config & (IOAPIC_CONFIG_TRIGGER_MODE_LEVEL | IOAPIC_CONFIG_MASKED)) ===
      IOAPIC_CONFIG_MASKED) {
      // edge triggered and masked
      return;
    }

    this.irr |= mask;

    this.check_irq(i);
  }
};

IOAPIC.prototype.clear_irq = function(i) {
  if (i >= IOAPIC_IRQ_COUNT) {
    return;
  }

  var mask = 1 << i;

  if ((this.irq_value & mask) === mask) {
    this.irq_value &= ~mask;

    var config = this.ioredtbl_config[i];
    if (config & IOAPIC_CONFIG_TRIGGER_MODE_LEVEL) {
      this.irr &= ~mask;
    }
  }
};

IOAPIC.prototype.read = function(reg) {
  if (reg === 0) {
    return this.ioapic_id << 24;
  } else if (reg === 1) {
    return 0x11 | IOAPIC_IRQ_COUNT - 1 << 16;
  } else if (reg === 2) {
    return this.ioapic_id << 24;
  } else if (reg >= 0x10 && reg < 0x10 + 2 * IOAPIC_IRQ_COUNT) {
    var irq = reg - 0x10 >> 1;
    var index = reg & 1;

    if (index) {
      var value = this.ioredtbl_destination[irq];
    } else {
      var value = this.ioredtbl_config[irq];
    }
    return value;
  } else {
    return 0;
  }
};

IOAPIC.prototype.write = function(reg, value) {
  if (reg === 0) {
    this.ioapic_id = value >>> 24 & 0x0F;
  } else if (reg === 1 || reg === 2) {} else if (reg >= 0x10 && reg < 0x10 + 2 * IOAPIC_IRQ_COUNT) {
    var irq = reg - 0x10 >> 1;
    var index = reg & 1;

    if (index) {
      this.ioredtbl_destination[irq] = value & 0xFF000000;
    } else {
      var old_value = this.ioredtbl_config[irq];
      this.ioredtbl_config[irq] = value & ~IOAPIC_CONFIG_READONLY_MASK | old_value & IOAPIC_CONFIG_READONLY_MASK;

      var vector = value & 0xFF;
      var delivery_mode = value >> 8 & 7;
      var destination_mode = value >> 11 & 1;
      var is_level = value >> 15 & 1;
      var disabled = value >> 16 & 1;

      this.check_irq(irq);
    }
  } else {}
};

IOAPIC.prototype.get_state = function() {
  var state = [];
  state[0] = this.ioredtbl_config;
  state[1] = this.ioredtbl_destination;
  state[2] = this.ioregsel;
  state[3] = this.ioapic_id;
  state[4] = this.irr;
  state[5] = this.irq_value;
  return state;
};

IOAPIC.prototype.set_state = function(state) {
  this.ioredtbl_config = state[0];
  this.ioredtbl_destination = state[1];
  this.ioregsel = state[2];
  this.ioapic_id = state[3];
  this.irr = state[4];
  this.irq_value = state[5];
};


exports.IOAPIC = IOAPIC;
