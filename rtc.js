const CMOS_RTC_SECONDS = 0x00;
const CMOS_RTC_SECONDS_ALARM = 0x01;
const CMOS_RTC_MINUTES = 0x02;
const CMOS_RTC_MINUTES_ALARM = 0x03;
const CMOS_RTC_HOURS = 0x04;
const CMOS_RTC_HOURS_ALARM = 0x05;
const CMOS_RTC_DAY_WEEK = 0x06;
const CMOS_RTC_DAY_MONTH = 0x07;
const CMOS_RTC_MONTH = 0x08;
const CMOS_RTC_YEAR = 0x09;
const CMOS_STATUS_A = 0x0a;
const CMOS_STATUS_B = 0x0b;
const CMOS_STATUS_C = 0x0c;
const CMOS_STATUS_D = 0x0d;
const CMOS_RESET_CODE = 0x0f;

const CMOS_FLOPPY_DRIVE_TYPE = 0x10;
const CMOS_DISK_DATA = 0x12;
const CMOS_EQUIPMENT_INFO = 0x14;
const CMOS_MEM_BASE_LOW = 0x15;
const CMOS_MEM_BASE_HIGH = 0x16;
const CMOS_MEM_OLD_EXT_LOW = 0x17;
const CMOS_MEM_OLD_EXT_HIGH = 0x18;
const CMOS_DISK_DRIVE1_TYPE = 0x19;
const CMOS_DISK_DRIVE2_TYPE = 0x1a;
const CMOS_DISK_DRIVE1_CYL = 0x1b;
const CMOS_DISK_DRIVE2_CYL = 0x24;
const CMOS_MEM_EXTMEM_LOW = 0x30;
const CMOS_MEM_EXTMEM_HIGH = 0x31;
const CMOS_CENTURY = 0x32;
const CMOS_MEM_EXTMEM2_LOW = 0x34;
const CMOS_MEM_EXTMEM2_HIGH = 0x35;
const CMOS_BIOS_BOOTFLAG1 = 0x38;
const CMOS_BIOS_DISKTRANSFLAG = 0x39;
const CMOS_BIOS_BOOTFLAG2 = 0x3d;
const CMOS_MEM_HIGHMEM_LOW = 0x5b;
const CMOS_MEM_HIGHMEM_MID = 0x5c;
const CMOS_MEM_HIGHMEM_HIGH = 0x5d;
const CMOS_BIOS_SMP_COUNT = 0x5f;


function RTC(cpu)
{
    this.cpu = cpu;

    this.cmos_index = 0;
    this.cmos_data = new Uint8Array(128);

    // used for cmos entries
    this.rtc_time = Date.now();
    this.last_update = this.rtc_time;

    // used for periodic interrupt
    this.next_interrupt = 0;

    // next alarm interrupt
    this.next_interrupt_alarm = 0;

    this.periodic_interrupt = false;

    // corresponds to default value for cmos_a
    this.periodic_interrupt_time = 1000 / 1024;

    this.cmos_a = 0x26;
    this.cmos_b = 2;
    this.cmos_c = 0;

    this.nmi_disabled = 0;

    cpu.io.register_write(0x70, this, function(out_byte)
    {
        this.cmos_index = out_byte & 0x7F;
        this.nmi_disabled = out_byte >> 7;
    });

    cpu.io.register_write(0x71, this, this.cmos_port_write);
    cpu.io.register_read(0x71, this, this.cmos_port_read);
}

RTC.prototype.get_state = function()
{
    var state = [];

    state[0] = this.cmos_index;
    state[1] = this.cmos_data;
    state[2] = this.rtc_time;
    state[3] = this.last_update;
    state[4] = this.next_interrupt;
    state[5] = this.next_interrupt_alarm;
    state[6] = this.periodic_interrupt;
    state[7] = this.periodic_interrupt_time;
    state[8] = this.cmos_a;
    state[9] = this.cmos_b;
    state[10] = this.cmos_c;
    state[11] = this.nmi_disabled;

    return state;
};

RTC.prototype.set_state = function(state)
{
    this.cmos_index = state[0];
    this.cmos_data = state[1];
    this.rtc_time = state[2];
    this.last_update = state[3];
    this.next_interrupt = state[4];
    this.next_interrupt_alarm = state[5];
    this.periodic_interrupt = state[6];
    this.periodic_interrupt_time = state[7];
    this.cmos_a = state[8];
    this.cmos_b = state[9];
    this.cmos_c = state[10];
    this.nmi_disabled = state[11];
};

RTC.prototype.timer = function(time, legacy_mode)
{
    time = Date.now(); // XXX
    this.rtc_time += time - this.last_update;
    this.last_update = time;

    if(this.periodic_interrupt && this.next_interrupt < time)
    {
        this.cpu.device_raise_irq(8);
        this.cmos_c |= 1 << 6 | 1 << 7;

        this.next_interrupt += this.periodic_interrupt_time *
                Math.ceil((time - this.next_interrupt) / this.periodic_interrupt_time);
    }
    else if(this.next_interrupt_alarm && this.next_interrupt_alarm < time)
    {
        this.cpu.device_raise_irq(8);
        this.cmos_c |= 1 << 5 | 1 << 7;

        this.next_interrupt_alarm = 0;
    }

    let t = 100;

    if(this.periodic_interrupt && this.next_interrupt)
    {
        t = Math.min(t, Math.max(0, this.next_interrupt - time));
    }
    if(this.next_interrupt_alarm)
    {
        t = Math.min(t, Math.max(0, this.next_interrupt_alarm - time));
    }

    return t;
};

RTC.prototype.bcd_pack = function(n)
{
    var i = 0,
        result = 0,
        digit;

    while(n)
    {
        digit = n % 10;

        result |= digit << (4 * i);
        i++;
        n = (n - digit) / 10;
    }

    return result;
};

RTC.prototype.bcd_unpack = function(n)
{
    const low = n & 0xF;
    const high = n >> 4 & 0xF;

    return low + 10 * high;
};

RTC.prototype.encode_time = function(t)
{
    if(this.cmos_b & 4)
    {
        // binary mode
        return t;
    }
    else
    {
        return this.bcd_pack(t);
    }
};

RTC.prototype.decode_time = function(t)
{
    if(this.cmos_b & 4)
    {
        // binary mode
        return t;
    }
    else
    {
        return this.bcd_unpack(t);
    }
};

// TODO
// - interrupt on update
// - countdown
// - letting bios/os set values
// (none of these are used by seabios or the OSes we're
// currently testing)
RTC.prototype.cmos_port_read = function()
{
    var index = this.cmos_index;

    //this.cmos_index = 0xD;

    switch(index)
    {
        case CMOS_RTC_SECONDS:
            return this.encode_time(new Date(this.rtc_time).getUTCSeconds());
        case CMOS_RTC_MINUTES:
            return this.encode_time(new Date(this.rtc_time).getUTCMinutes());
        case CMOS_RTC_HOURS:
            // TODO: 12 hour mode
            return this.encode_time(new Date(this.rtc_time).getUTCHours());
        case CMOS_RTC_DAY_MONTH:
            return this.encode_time(new Date(this.rtc_time).getUTCDate());
        case CMOS_RTC_MONTH:
            return this.encode_time(new Date(this.rtc_time).getUTCMonth() + 1);
        case CMOS_RTC_YEAR:
            return this.encode_time(new Date(this.rtc_time).getUTCFullYear() % 100);

        case CMOS_STATUS_A:
            return this.cmos_a;
        case CMOS_STATUS_B:
            return this.cmos_b;

        case CMOS_STATUS_C:
            // It is important to know that upon a IRQ 8, Status Register C
            // will contain a bitmask telling which interrupt happened.
            // What is important is that if register C is not read after an
            // IRQ 8, then the interrupt will not happen again.
            this.cpu.device_lower_irq(8);

            // Missing IRQF flag
            //return cmos_b & 0x70;
            var c = this.cmos_c;

            this.cmos_c &= ~0xF0;

            return c;

        case CMOS_STATUS_D:
            return 0;

        case CMOS_CENTURY:
            return this.encode_time(new Date(this.rtc_time).getUTCFullYear() / 100 | 0);

        default:
            return this.cmos_data[this.cmos_index];
    }
};

RTC.prototype.cmos_port_write = function(data_byte)
{
    switch(this.cmos_index)
    {
        case 0xA:
            this.cmos_a = data_byte & 0x7F;
            this.periodic_interrupt_time = 1000 / (32768 >> (this.cmos_a & 0xF) - 1);

            break;
        case 0xB:
            this.cmos_b = data_byte;
            if(this.cmos_b & 0x40)
            {
                this.next_interrupt = Date.now();
            }

            if(this.cmos_b & 0x20)
            {
                const now = new Date();

                const seconds = this.decode_time(this.cmos_data[CMOS_RTC_SECONDS_ALARM]);
                const minutes = this.decode_time(this.cmos_data[CMOS_RTC_MINUTES_ALARM]);
                const hours = this.decode_time(this.cmos_data[CMOS_RTC_HOURS_ALARM]);

                const alarm_date = new Date(Date.UTC(
                    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                    hours, minutes, seconds
                ));

                const ms_from_now = alarm_date - now;

                this.next_interrupt_alarm = +alarm_date;
            }

            break;

        case CMOS_RTC_SECONDS_ALARM:
        case CMOS_RTC_MINUTES_ALARM:
        case CMOS_RTC_HOURS_ALARM:
            this.cmos_write(this.cmos_index, data_byte);
            break;
    }

    this.periodic_interrupt = (this.cmos_b & 0x40) === 0x40 && (this.cmos_a & 0xF) > 0;
};

RTC.prototype.cmos_read = function(index)
{
    return this.cmos_data[index];
};

RTC.prototype.cmos_write = function(index, value)
{
    this.cmos_data[index] = value;
};


exports.RTC = RTC;
