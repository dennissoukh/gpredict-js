const PredictTLE    = require('../src/TLE');
const PredictSat    = require('../src/Sat');
const PredictMath   = require('../src/Math');

const satTle = {
    line0: 'TEST SAT SDP 001',
    line1: '1 11801U          80230.29629788  .01431103  00000-0  14311-1 0     2',
    line2: '2 11801  46.7916 230.4354 7318036  47.4722  10.4117  2.28537848     2'
}

const expected = [
    {
        step : 0.0,
        x    : 7473.37066650,
        y    : 428.95261765,
        z    : 5828.74786377,
        vx   : 5.1071513,
        vy   : 6.44468284,
        vz   : -0.18613096
    },
    {
        step : 360.0,
        x    : -3305.22537232,
        y    : 32410.86328125,
        z    : -24697.17675781,
        vx   : -1.30113538,
        vy   : -1.15131518,
        vz   : -0.28333528
    },
    {
        step : 720.0,
        x    : 14271.28759766,
        y    : 24110.46411133,
        z    : -4725.76837158,
        vx   : -0.32050445,
        vy   : 2.67984074,
        vz   : -2.08405289
    },
    {
        step : 1080.0,
        x    : -9990.05883789,
        y    : 22717.35522461,
        z    : -23616.890662501,
        vx   : -1.01667246,
        vy   : -2.29026759,
        vz   : 0.72892364
    },
    {
        step : 1440.0,
        x    : 9787.86975097,
        y    : 33753.34667969,
        z    : -15030.81176758,
        vx   : -1.09425966,
        vy   : 0.92358845,
        vz   : -1.52230928
    }
];

let data    = [],
    tle     = new PredictTLE(satTle.line0, satTle.line1, satTle.line2),
    sat     = new PredictSat(tle),
    count   = 0;

expected.forEach(e => {
    sat.sgpsdp.sgp4(sat, e.step);
    PredictMath.convertSatState(sat.pos, sat.vel);

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

console.log(`DEEP_SPACE_EPHEM: ${sat.flags & sat.sgpsdp.DEEP_SPACE_EPHEM_FLAG} (expected: 64)`)
console.log(data);
