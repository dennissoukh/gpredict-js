const PredictMath   = require('./Math');
const Time          = require('./Time');
const Constants     = require('./Constants');
const Vector        = require('./Vector');

class PredictSGPObs
{
    CalculateUserPosVel = (time, geodetic, obs_pos, obs_vel) =>
    {
        let sinGeodeticLat, c, sq, achcp;

        sinGeodeticLat      = Math.sin(geodetic.lat);
        geodetic.theta      = PredictMath.fMod2p(Time.ThetaG_JD(time) + geodetic.lon);  /* LMST */

        c                   = 1 / Math.sqrt(1 + Constants.__f * (Constants.__f - 2) * sinGeodeticLat * sinGeodeticLat);
        sq                  = (1 - Constants.__f) * (1 - Constants.__f) * c;
        achcp               = (Constants.xkmper * c + geodetic.alt) * Math.cos(geodetic.lat);

        obs_pos.x           = achcp * Math.cos(geodetic.theta);     /* kilometers */
        obs_pos.y           = achcp * Math.sin(geodetic.theta);
        obs_pos.z           = (Constants.xkmper * sq + geodetic.alt) * sinGeodeticLat;
        obs_vel.x           = -Constants.mfactor * obs_pos.y;       /* kilometers/second */
        obs_vel.y           =  Constants.mfactor * obs_pos.x;
        obs_vel.z           =  0;
        obs_pos.w           = Math.sqrt(obs_pos.x * obs_pos.x + obs_pos.y * obs_pos.y + obs_pos.z * obs_pos.z);
        obs_vel.w           = Math.sqrt(obs_vel.x * obs_vel.x + obs_vel.y * obs_vel.y + obs_vel.z * obs_vel.z);
    }

    CalculateLatLonAlt = (_time, pos, geodetic) =>
    {
        let r, e2, phi, sinPhi, c;
        geodetic.theta  = PredictMath.acTan(pos.y, pos.x);                              /*radians*/
        geodetic.lon    = PredictMath.fMod2p(geodetic.theta - Time.ThetaG_JD(_time));   /*radians*/

        r               = Math.sqrt((pos.x * pos.x) + (pos.y * pos.y));
        e2              = Constants.__f * (2 - Constants.__f);

        geodetic.lat    = PredictMath.acTan(pos.z, r);

        do {
            phi         = geodetic.lat;
            sinPhi      = Math.sin(phi);
            c           = 1 / Math.sqrt(1 - e2 * (sinPhi * sinPhi));
            geodetic.lat = PredictMath.acTan(pos.z + Constants.xkmper * c * e2 * sinPhi, r);
        } while (Math.abs(geodetic.lat - phi) >= 1e-10);

        geodetic.alt = r / Math.cos(geodetic.lat) - Constants.xkmper * c;

        if (geodetic.lat > Constants.pio2) {
            geodetic.lat -= Constants.twopi;
        }
    }

    CalculateObs = (_time, pos, vel, geodetic, obs_set) =>
    {
        let obs_pos = new Vector(),
            obs_vel = new Vector(),
            range   = new Vector(),
            rgvel   = new Vector();

        let sin_lat, cos_lat, sin_theta, cos_theta, top_s, top_e,
            top_z, azim, el;

        this.CalculateUserPosVel(_time, geodetic, obs_pos, obs_vel);

        range.x = pos.x - obs_pos.x;
        range.y = pos.y - obs_pos.y;
        range.z = pos.z - obs_pos.z;

        rgvel.x = vel.x - obs_vel.x;
        rgvel.y = vel.y - obs_vel.y;
        rgvel.z = vel.z - obs_vel.z;

        range.w = Math.sqrt(range.x * range.x + range.y * range.y + range.z * range.z);

        sin_lat     = Math.sin(geodetic.lat);
        cos_lat     = Math.cos(geodetic.lat);
        sin_theta   = Math.sin(geodetic.theta);
        cos_theta   = Math.cos(geodetic.theta);
        top_s       = sin_lat * cos_theta * range.x
                    + sin_lat * sin_theta * range.y
                    - cos_lat * range.z;
        top_e       = -sin_theta * range.x
                    + cos_theta * range.y;
        top_z       = cos_lat * cos_theta * range.x
                    + cos_lat * sin_theta * range.y
                    + sin_lat * range.z;
        azim        = Math.atan(-top_e / top_s); /* Azimuth */

        if (top_s > 0) {
            azim = azim + Constants.pi;
        }

        if (azim < 0) {
            azim = azim + Constants.twopi;
        }

        el = Math.asin(top_z / range.w);

        obs_set.az      = azim;         /* Azimuth (radians)   */
        obs_set.el      = el;           /* Elevation (radians) */
        obs_set.range   = range.w;      /* Range (kilometers)  */

        /* Range Rate (kilometers/second) */
        obs_set.range_rate = PredictMath.dot(range, rgvel) / range.w;

        /**
         * Corrections for atmospheric refraction
         * Reference:  Astronomical Algorithms by Jean Meeus, pp. 101-104
         * Correction is meaningless when apparent elevation is below horizon
         * obs_set.el = obs_set.el + Radians((1.02/tan(Radians(Degrees(el)+
         * 10.3/(Degrees(el)+5.11))))/60)
         */

        if (obs_set.el < 0) {
            obs_set.el = el;  /* Reset to true elevation */
        }
    }
}

module.exports = new PredictSGPObs
