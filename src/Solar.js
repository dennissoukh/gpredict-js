const Time          = require('./Time');
const PredictMath   = require('./Math');
const Constants     = require('./Constants');
const Vector        = require('./Vector');
const ObsSet        = require('./ObsSet');
const Geodetic      = require('./Geodetic');
const SGPObs        = require('./SGPObs');

class PredictSolar
{
    CalculateSolarPosition = (time, solar_vector) =>
    {
        let mjd, year, T, M, L, e, C, O, Lsa, nu, R, eps;

        mjd     = time - 2415020.0;
        year    = 1900 + mjd / 365.25;
        T       = (mjd + Time.Delta_ET(year) / Constants.secday) / 36525.0;
        M       = PredictMath.radians(PredictMath.modulus(358.47583 + PredictMath.modulus(35999.04975 * T, 360.0)
                - (0.000150 + 0.0000033 * T) * (T * T), 360.0));
        L       = PredictMath.radians(PredictMath.modulus(279.69668 + PredictMath.modulus(36000.76892 * T, 360.0)
                + 0.0003025 * (T * T), 360.0));
        e       = 0.01675104 - (0.0000418 + 0.000000126 * T) * T;
        C       = PredictMath.radians((1.919460 - (0.004789 + 0.000014 * T) * T) * Math.sin(M)
                + (0.020094 - 0.000100 * T) * Math.sin(2 * M) + 0.000293 * Math.sin(3 * M));
        O       = PredictMath.radians(PredictMath.modulus(259.18 - 1934.142 * T, 360.0));
        Lsa     = PredictMath.modulus(L + C - PredictMath.radians(0.00569 - 0.00479 * Math.sin(O)), Constants.twopi);
        nu      = PredictMath.modulus(M + C, Constants.twopi);
        R       = 1.0000002 * (1 - (e * e)) / (1 + e * Math.cos(nu));
        eps     = PredictMath.radians(23.452294 - (0.0130125 + (0.00000164 - 0.000000503 * T) * T) * T + 0.00256 * Math.cos(O));
        R       = Constants.AU * R;

        solar_vector.x = R * Math.cos(Lsa);
        solar_vector.y = R * Math.sin(Lsa) * Math.cos(eps);
        solar_vector.z = R * Math.sin(Lsa) * Math.sin(eps);
        solar_vector.w = R;
    }

    SatEclipsed = (pos, sol, depth) =>
    {
        let Rho, earth, sd_earth, sd_sun, delta;

        Rho   = new Vector();
        earth = new Vector();

        /* Determine partial eclipse */
        sd_earth = Math.asin(Constants.xkmper / pos.w)
        PredictMath.vecSub(sol, pos, Rho);
        sd_sun = Math.asin(Constants.__sr__ / Rho.w)
        PredictMath.scalarMultiply(-1, pos, earth);
        delta = PredictMath.angle(sol, earth);
        depth = sd_earth - sd_sun - delta;

        if (sd_earth < sd_sun) {
            return 0;
        } else if (depth >= 0) {
            return 1;
        } else {
            return 0;
        }
    }

    FindSun = (qth, daynum = null) =>
    {
        let obs_geodetic, solar_vector, zero_vector, solar_set;

        if (daynum === null) {
            daynum = Time.GetCurrentDayNumber();
        }

        obs_geodetic        = new Geodetic();
        obs_geodetic.lon    = qth.lon * Constants.de2ra;
        obs_geodetic.lat    = qth.lat * Constants.de2ra;
        obs_geodetic.alt    = qth.alt / 1000.0;
        obs_geodetic.theta  = 0;

        solar_vector = new Vector();
        zero_vector  = new Vector();
        solar_set    = new ObsSet();

        this.CalculateSolarPosition(daynum, solar_vector);

        SGPObs.CalculateObs(
            daynum,
            solar_vector,
            zero_vector,
            obs_geodetic,
            solar_set
        );

        solar_set.az = PredictMath.degrees(solar_set.az);
        solar_set.el = PredictMath.degrees(solar_set.el);

        return solar_set;
    }
}

module.exports = new PredictSolar
