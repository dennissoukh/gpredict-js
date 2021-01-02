const PredictTLE = require('../src/TLE');
const PredictSat = require('../src/Sat');
const PredictSGPSDP = require('../src/SGPSDP');
const PredictMath = require('../src/Math');

const satTle = {
    line0: 'TEST SAT SGP 001',
    line1: '1 88888U          80275.98708465  .00073094  13844-3  66816-4 0     9',
    line2: '2 88888  72.8435 115.9689 0086731  52.6988 110.5714 16.05824518   103'
}

const expected = [
    {
        step : 0.0,
        x    : 2328.97048951,
        y    : -5995.22076416,
        z    : 1719.97067261,
        vx   : 2.91207230,
        vy   : -0.98341546,
        vz   : -7.09081703
    },
    {
        step : 360.0,
        x    : 2456.10705566,
        y    : -6071.93853760,
        z    : 1222.89727783,
        vx   : 2.67938992,
        vy   : -0.44829041,
        vz   : -7.22879231
    },
    {
        step : 720.0,
        x    : 2567.56195068,
        y    : -6112.50384522,
        z    : 713.96397400,
        vx   : 2.44024599,
        vy   : 0.09810869,
        vz   : -7.31995916
    },
    {
        step : 1080.0,
        x    : 2663.09078980,
        y    : -6115.48229980,
        z    : 196.39640427,
        vx   : 2.19611958,
        vy   : 0.65241995,
        vz   : -7.36282432
    },
    {
        step : 1440.0,
        x    : 2742.55133057,
        y    : -6079.67144775,
        z    : -326.38095856,
        vx   : 1.94850229,
        vy   : 1.21106251,
        vz   : -7.35619372
    }
]

let data = [];
let tle = new PredictTLE(satTle.line0, satTle.line1, satTle.line2),
    sat = new PredictSat(tle),
    sgpsdp = new PredictSGPSDP;

let count = 0;

expected.forEach(e => {
    sgpsdp.SGP4(sat, e.step);
    PredictMath.ConvertSatState(sat.pos, sat.vel);

    data[count] = {
        step_time   : e.step,
        label       : 'X',
        result      : sat.pos.x,
        expected    : e.x
    };

    count++;
    data[count] = {
        step_time   : '',
        label       : 'Y',
        result      : sat.pos.y,
        expected    : e.y
    };

    count++;
    data[count] = {
        step_time   : '',
        label       : 'Z',
        result      : sat.pos.z,
        expected    : e.z
    };

    count++;
    data[count] = {
        step_time   : '',
        label       : 'VX',
        result      : sat.vel.x,
        expected    : e.vx
    };

    count++;
    data[count] = {
        step_time   : '',
        label       : 'VY',
        result      : sat.vel.y,
        expected    : e.vy
    };

    count++;
    data[count] = {
        step_time   : '',
        label       : 'VZ',
        result      : sat.vel.z,
        expected    : e.vz
    };
});

console.log(`DEEP_SPACE_EPHEM: ${sat.flags & sgpsdp.DEEP_SPACE_EPHEM_FLAG} (expected: 0)`)
console.log(data);
