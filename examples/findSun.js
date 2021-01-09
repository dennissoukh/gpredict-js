// Find the current solar position in the sky from a given location
const PredictQTH    = require('../src/QTH');
const PredictSolar  = require('../src/Solar');
const PredictTime  = require('../src/Time');

// Setup the observer
const qth   = new PredictQTH();
qth.alt     = 10;
qth.lat     = 37.786759;
qth.lon     = -122.405162;

// Use current time
const daynum = PredictTime.getCurrentJulianTimestamp();

// Locate the sun
const sunInfo = PredictSolar.findSun(qth, daynum);

// Print results
console.log(sunInfo.el, sunInfo.az, PredictTime.dayNumberToReadable(daynum));