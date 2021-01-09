// Get the upcoming passes for a location

const Predict       = require('../Predict');
const PredictQTH    = require('../src/QTH');
const PredictTLE    = require('../src/TLE');
const PredictTime   = require('../src/Time');
const PredictSat    = require('../src/Sat');

predict     = new Predict();
qth         = new PredictQTH();

// Set observer information
qth.alt     = 60;
qth.lat     = 53.10;
qth.lon     = -8.98;

// Define a satellite TLE
const satTle  = {
    line0: 'ISS (ZARYA)',
    line1: '1 25544U 98067A   21009.59390613  .00001808  00000-0  40563-4 0  9997',
    line2: '2 25544  51.6462  47.1650 0000551 205.9519 291.1953 15.49274498264017'
}

tle = new PredictTLE(satTle.line0, satTle.line1, satTle.line2);

let sat = new PredictSat(tle),
    now = PredictTime.getCurrentJulianTimestamp();

let results     = predict.getPasses(sat, qth, now, 20),
    filtered    = predict.filterVisiblePasses(results);

// Print the visible passes
filtered.forEach(pass => {
    console.log(PredictTime.dayNumberToReadable(pass.visible_aos), PredictTime.dayNumberToReadable(pass.visible_tca), PredictTime.dayNumberToReadable(pass.visible_los));
});

// Print all satellite passes, even if they are not visible
results.forEach(pass => {
    console.log(PredictTime.dayNumberToReadable(pass.aos), PredictTime.dayNumberToReadable(pass.tca), PredictTime.dayNumberToReadable(pass.los));
});