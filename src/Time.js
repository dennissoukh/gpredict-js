const Constants     = require('./Constants');
const PredictMath   = require('./Math');

/**
 * Return the Julian Date of an epoch specified in the format used in the NORAD
 * two-line element sets. It supports dates through 2056 December 31.
 *
 * @param {number} epoch
 * @return {number}
 */
julianDateOfEpoch = (epoch) => {
    let year  = Math.floor(epoch * 1e-3);
    const day = PredictMath.frac(epoch * 1e-3) * 1e3;

    if (year < 57) {
        year = year + 2000;
    } else {
        year = year + 1900;
    }

    return (julianDateOfYear(year) + day);
};

/**
 * Calculate the Julian Date of Day 0.0 of {year}.
 *
 * @param {number} epoch
 * @return {number}
 */
julianDateOfYear = (year) => {
    let i;

    year    = year - 1;
    i       = Math.floor(year / 100);

    const A = i;
    i       = Math.floor(A / 4);

    const B = (2 - A + i);
    i       = Math.floor(365.25 * year);
    i      += Math.floor(30.6001 * 14);

    return  (i + 1720994.5 + B);
};

/**
 * Calculate the Greenwich Mean Sidereal Time for an epoch specified in the
 * format used in the NORAD two-line element sets.
 *
 * @param {number} epoch
 * @param {number} deep_arg
 * @return {number}
 */
thetaG = (epoch, deep_arg) => {
    let year = Math.floor(epoch * 1e-3);
    const day = PredictMath.frac(epoch * 1e-3, year) * 1e3;

    if (year < 57) {
        year += 2000;
    } else {
        year += 1900;
    }

    const UT = PredictMath.frac(day);
    const jd = Math.floor(julianDateOfYear(year) + day);
    deep_arg.ds50 = jd - 2433281.5 + UT;

    return PredictMath.fMod2p(6.3003880987 * deep_arg.ds50 + 1.72944494);
};

/**
 * Calculate the Greenwich Mean Sidereal Time for a specified Julian date.
 *
 * @param {number} jd
 * @return {number}
 */
thetaGJD = (jd) => {
    const UT   = PredictMath.frac(jd + 0.5);
    jd          = jd - UT;
    const TU   = (jd - 2451545.0) / 36525;

    GMST = 24110.54841 + TU * (8640184.812866 + TU * (0.093104 - TU * 6.2e-6));
    GMST = PredictMath.modulus(GMST + Constants.secday *
        Constants.omega_E * UT,
        Constants.secday,
    );

    return Constants.twopi * GMST / Constants.secday;
};

/**
 * Get the current Julian day.
 *
 * @return {number}
 */
getCurrentDayNumber = () => {
    return Math.floor((new Date / 86400000) + 2440587.5);
};

/**
 * Get difference between UT (approximately the same as UTC) and ET (now
 * referred to as TDT). This is based on a least squares fit of data from 1950
 * to 1991 and will need to be updated periodically.
 *
 * @param {number} year
 */
deltaET = (year) => {
    const deltaET = 26.465 + 0.747622 * (year - 1950) +
        1.886913 * Math.sin(Constants.twopi * (year - 1975) / 33,
        );

    return deltaET;
};

/**
 * Convert a Julian timestamp to an ISO timestamp.
 *
 * @param {number} dn
 * @return {timestamp}
 */
dayNumberToReadable = (dn) => {
    return timestamp = new Date((dn - 2440587.5) * 86400000);
};

/**
 * Returns the unix timestamp of a TLE's epoch.
 *
 * @param {PredictTLE} tle
 * @return {number}
 */
getEpochTimestamp = (tle) => {
    const year    = tle.epoch_year;
    const day     = tle.epoch_day;
    const sec     = Math.round(86400 * tle.epoch_fod);
    const date    = new Date();

    date.setUTCFullYear(year);
    date.setUTCMonth(1);
    date.setUTCDate(1);

    date.setTime(0);

    return date + (86400 * day) + sec - 86400;
};

/**
 * Get the current Julian timestamp.
 *
 * @return {number}
 */
getCurrentJulianTimestamp = () => {
    const date = new Date;
    return (date.valueOf() / 86400000 + 2440587.5);
};

module.exports = {
    julianDateOfEpoch,
    julianDateOfYear,
    thetaG,
    thetaGJD,
    getCurrentDayNumber,
    deltaET,
    dayNumberToReadable,
    getEpochTimestamp,
    getCurrentJulianTimestamp,
};
