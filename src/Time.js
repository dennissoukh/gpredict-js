const Constants     = require('./Constants');
const PredictMath   = require('./Math');

class PredictTime
{
    JulianDateOfEpoch = (epoch) =>
    {
        let year, day;

        year    = Math.floor(epoch * 1e-3);
        day     = PredictMath.frac(epoch * 1e-3) * 1e3;

        if (year < 57) {
            year = year + 2000;
        } else {
            year = year + 1900;
        }

        return (this.JulianDateOfYear(year) + day);
    }

    /* Equivalent to the C modf function */
    // modf = (x) =>
    // {
    //     let ipart = Math.trunc(x);
    //     return x - ipart;
    // }

    JulianDateOfYear = (year) =>
    {
        let i, A, B, jdoy;

        year = year - 1;
        i = Math.floor(year / 100);
        A = i;
        i = Math.floor(A / 4);
        B = (2 - A + i);
        i = Math.floor(365.25 * year);
        i += Math.floor(30.6001 * 14);
        jdoy = i + 1720994.5 + B;

        return jdoy;
    }

    ThetaG = (epoch, deep_arg) =>
    {
        let year, day, UT, jd, TU, GMST;

        year = Math.floor(epoch * 1e-3);
        day = PredictMath.frac(epoch * 1e-3, year) * 1e3;

        if (year < 57) {
            year += 2000;
        } else {
            year += 1900;
        }

        UT = PredictMath.frac(day);
        jd = Math.floor(this.JulianDateOfYear(year) + day);
        TU = (jd - 2451545.0) / 36525;
        GMST = 24110.54841 + TU * (8640184.812866 + TU * (0.093104 - TU * 6.2E-6));
        GMST = PredictMath.modulus(GMST + Constants.secday * Constants.omega_E * UT, Constants.secday);
        deep_arg.ds50 = jd - 2433281.5 + UT;

        return PredictMath.fMod2p(6.3003880987 * deep_arg.ds50 + 1.72944494);
    }

    ThetaG_JD = (jd) =>
    {
        let UT, TU, GMST;

        UT   = PredictMath.frac(jd + 0.5);
        jd   = jd - UT;
        TU   = (jd - 2451545.0) / 36525;
        GMST = 24110.54841 + TU * (8640184.812866 + TU * (0.093104 - TU * 6.2e-6));
        GMST = PredictMath.modulus(GMST + Constants.secday * Constants.omega_E * UT, Constants.secday);

        return Constants.twopi * GMST / Constants.secday;
    }

    GetCurrentDayNumber = () =>
    {
        let now, start, diff, oneDay;

        now     = new Date();
        start   = new Date(now.getFullYear(), 0, 0);
        diff    = now - start;
        oneDay  = 1000 * 60 * 60 * 24;

        return Math.floor(diff / oneDay);
    }

    GetDayNumber = (sec, usec = 0) =>
    {
        let time = (((sec + usec) / 86400.0) - 3651.0);
        return time + 2444238.5;
    }

    Delta_ET = (year) =>
    {
        let delta_et;
        delta_et = 26.465 + 0.747622 * (year - 1950) + 1.886913 * Math.sin(Constants.twopi * (year - 1975) / 33);

        return delta_et;
    }

    DayNumberToUnix = (dn) =>
    {
        return (86400.0 * (dn - 2444238.5 + 3651.0));
    }

    DayNumberToReadable = (dn) =>
    {
        let timestamp = new Date((dn - 2440587.5) * 86400000);

        return timestamp;
    }

    GetEpochTimestamp = (tle) =>
    {
        let year, day, sec, date;

        year    = tle.epoch_year;
        day     = tle.epoch_day;
        sec     = Math.round(86400 * tle.epoch_fod);
        date    = new Date();

        date.setUTCFullYear(year);
        date.setUTCMonth(1);
        date.setUTCDate(1);

        date.setTime(0);

        return date + (86400 * day) + sec - 86400;
    }

    GetCurrentJulianTimestamp = () =>
    {
        let date = new Date;

        return (date.valueOf() / 86400000 + 2440587.5);
    }
}

module.exports = new PredictTime
