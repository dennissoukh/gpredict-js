const Vector = require('./Vector');

/**
 * Pass detail entry.
 *
 * In order to ensure maximum flexibility at a minimal effort,
 * only the raw position and velocity is calculated. Calculations
 * of the "human readable" parameters are the responsibility of
 * the consumer. This way we can use the same prediction engine
 * for various consumers without having too much overhead and
 * complexity in the low level code.
 */
class PredictPassDetail {
    time;                   /* time in "jul_utc" */
    pos = new Vector();     /* Raw unprocessed position at time */
    vel = new Vector();     /* Raw unprocessed velocity at time */
    velo;
    az;
    el;
    range;
    range_rate;
    lat;
    lon;
    alt;
    ma;
    phase;
    footprint;
    vis;
    orbit;
}

module.exports = PredictPassDetail;
