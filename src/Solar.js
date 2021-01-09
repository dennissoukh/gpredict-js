const Time          = require('./Time');
const PredictMath   = require('./Math');
const Constants     = require('./Constants');
const Vector        = require('./Vector');
const ObsSet        = require('./ObsSet');
const Geodetic      = require('./Geodetic');
const SGPObs        = require('./SGPObs');

/**
 * Calculate the solar position at a specific time.
 *
 * @param {number} time
 * @param {Vector} solar_vector
 */
calculateSolarPosition = (time, solar_vector) => {
    let R;

    const mjd     = time - 2415020.0;
    const year    = 1900 + mjd / 365.25;
    const T       = (mjd + Time.deltaET(year) / Constants.secday) / 36525.0;
    const M       = PredictMath.radians(PredictMath.modulus(358.47583 +
                    PredictMath.modulus(35999.04975 * T, 360.0) -
                    (0.000150 + 0.0000033 * T) * (T * T), 360.0));
    const L       = PredictMath.radians(PredictMath.modulus(279.69668 +
                    PredictMath.modulus(36000.76892 * T, 360.0) +
                    0.0003025 * (T * T), 360.0));
    const e       = 0.01675104 - (0.0000418 + 0.000000126 * T) * T;
    const C       = PredictMath.radians((1.919460 - (0.004789 + 0.000014 *
                    T) * T) * Math.sin(M) + (0.020094 - 0.000100 * T) *
                    Math.sin(2 * M) + 0.000293 * Math.sin(3 * M));
    const O       = PredictMath.radians(PredictMath.modulus(259.18 -
                    1934.142 * T, 360.0));
    const Lsa     = PredictMath.modulus(L + C - PredictMath.radians(0.00569 -
                    0.00479 * Math.sin(O)), Constants.twopi);
    const nu      = PredictMath.modulus(M + C, Constants.twopi);
    R             = 1.0000002 * (1 - (e * e)) / (1 + e * Math.cos(nu));
    const eps     = PredictMath.radians(23.452294 - (0.0130125 + (0.00000164 -
                    0.000000503 * T) * T) * T + 0.00256 * Math.cos(O));
    R             = Constants.AU * R;

    solar_vector.x = R * Math.cos(Lsa);
    solar_vector.y = R * Math.sin(Lsa) * Math.cos(eps);
    solar_vector.z = R * Math.sin(Lsa) * Math.sin(eps);
    solar_vector.w = R;
};

/**
 * Calculate satellite's eclipse status and depth.
 *
 * @param {Vector} pos
 * @param {Vector} sol
 * @param {number} depth
 * @return {number}
 */
satEclipsed = (pos, sol, depth) => {
    const Rho   = new Vector();
    const earth = new Vector();

    /* Determine partial eclipse */
    const sd_earth = Math.asin(Constants.xkmper / pos.w);
    PredictMath.vecSub(sol, pos, Rho);

    const sd_sun = Math.asin(Constants.__sr__ / Rho.w);
    PredictMath.scalarMultiply(-1, pos, earth);

    const delta = PredictMath.angle(sol, earth);
    depth = sd_earth - sd_sun - delta;

    if (sd_earth < sd_sun) {
        return 0;
    } else if (depth >= 0) {
        return 1;
    } else {
        return 0;
    }
};

/**
 * Find the current location of the sun based on the observer
 * location.
 *
 * @param {QTH} qth
 * @param {number} daynum (Use null to use current daynum)
 * @return {ObsSet}
 */
findSun = (qth, daynum = null) => {
    if (!daynum) {
        daynum = Time.getCurrentDayNumber();
    }

    const obs_geodetic  = new Geodetic();
    obs_geodetic.lon    = qth.lon * Constants.de2ra;
    obs_geodetic.lat    = qth.lat * Constants.de2ra;
    obs_geodetic.alt    = qth.alt / 1000.0;
    obs_geodetic.theta  = 0;

    const solar_vector = new Vector();
    const zero_vector  = new Vector();
    const solar_set    = new ObsSet();

    calculateSolarPosition(daynum, solar_vector);

    SGPObs.calculateObs(
        daynum,
        solar_vector,
        zero_vector,
        obs_geodetic,
        solar_set,
    );

    solar_set.az = PredictMath.degrees(solar_set.az);
    solar_set.el = PredictMath.degrees(solar_set.el);

    return solar_set;
};

module.exports = {
    calculateSolarPosition,
    satEclipsed,
    findSun,
};
