const Predict       = require('../src/Predict');
const PredictQTH    = require('../src/QTH');
const PredictTLE    = require('../src/TLE');
const PredictTime   = require('../src/Time');
const PredictSat    = require('../src/Sat');

predict     = new Predict();
qth         = new PredictQTH();

qth.name    = 'Galway';
qth.alt     = 60;
qth.lat     = 53.10;
qth.lon     = -8.98;

const satTle  = {
    line0: 'ISS (ZARYA)',
    line1: '1 25544U 98067A   20366.36586220  .00001388  00000-0  33060-4 0  9995',
    line2: '2 25544  51.6465  92.8260 0001147 168.5597 306.8389 15.49242490262580'
}

tle = new PredictTLE(satTle.line0, satTle.line1, satTle.line2);

let sat = new PredictSat(tle),
    now = PredictTime.getCurrentJulianTimestamp();

let results     = predict.getPasses(sat, qth, now, 1, 10),
    filtered    = predict.filterVisiblePasses(results);

filtered.forEach(pass => {
    console.log(PredictTime.dayNumberToReadable(pass.visible_aos), PredictTime.dayNumberToReadable(pass.visible_tca), PredictTime.dayNumberToReadable(pass.visible_los))
});