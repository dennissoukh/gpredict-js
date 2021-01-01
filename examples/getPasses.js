const Predict       = require('../src/Predict');
const PredictQTH    = require('../src/QTH');
const PredictTLE    = require('../src/TLE');
const PredictTime   = require('../src/Time');
const PredictSat    = require('../src/Sat');

predict = new Predict();
qth     = new PredictQTH();

qth.name = 'Galway';
qth.alt = 60;
qth.lat = 53.28152;
qth.lon = -8.999173;

tle     = new PredictTLE('ISS (ZARYA)', '1 25544U 98067A   20366.36586220  .00001388  00000-0  33060-4 0  9995', '2 25544  51.6465  92.8260 0001147 168.5597 306.8389 15.49242490262580');

let sat = new PredictSat(tle),
    now = PredictTime.GetCurrentJulianTimestamp();

let results     = predict.getPasses(sat, qth, now, 1, 10),
    filtered    = predict.filterVisiblePasses(results);

filtered.forEach(pass => {
    console.log(PredictTime.DayNumberToReadable(pass.visible_aos), PredictTime.DayNumberToReadable(pass.visible_tca), PredictTime.DayNumberToReadable(pass.visible_los))
});