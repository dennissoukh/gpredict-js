const PredictMath   = require('./Math');
const Time          = require('./Time');
const Constants     = require('./Constants');
const Vector        = require('./Vector');

/**
 * Use the user's geodetic position and the time of interest to return the ECI
 * position and velocity of the observer. The velocity calculation assumes the
 * geodetic position is stationary relative to the Earth's surface.
 *
 * @param {number} time
 * @param {PredictGeodetic} geodetic
 * @param {PredictVector} obs_pos
 * @param {PredictVector} obs_vel
 */
calculateUserPosVel = (time, geodetic, obs_pos, obs_vel) => {
    const sinGeodeticLat = Math.sin(geodetic.lat);
    geodetic.theta = PredictMath.fMod2p(Time.thetaGJD(time) + geodetic.lon);

    const c     = 1 / Math.sqrt(1 + Constants.__f * (Constants.__f - 2) *
        sinGeodeticLat * sinGeodeticLat,
    );

    const sq    = (1 - Constants.__f) * (1 - Constants.__f) * c;

    const achcp = (Constants.xkmper * c + geodetic.alt) *
                Math.cos(geodetic.lat);

    obs_pos.x   = achcp * Math.cos(geodetic.theta);     /* kilometers */
    obs_pos.y   = achcp * Math.sin(geodetic.theta);
    obs_pos.z   = (Constants.xkmper * sq + geodetic.alt) * sinGeodeticLat;
    obs_vel.x   = -Constants.mfactor * obs_pos.y;       /* kilometers/second */
    obs_vel.y   =  Constants.mfactor * obs_pos.x;
    obs_vel.z   =  0;
    obs_pos.w   = Math.sqrt(obs_pos.x * obs_pos.x + obs_pos.y * obs_pos.y +
        obs_pos.z * obs_pos.z,
    );
    obs_vel.w   = Math.sqrt(obs_vel.x * obs_vel.x + obs_vel.y * obs_vel.y +
        obs_vel.z * obs_vel.z,
    );
};

/**
 * Calculate the geodetic position of an object given its ECI position. This
 * can be used to determine the ground track of a satellite. The calculations
 * assume the Earth to be an oblate spheroid as defined in WGS '72.
 *
 * @param {number} time
 * @param {Vector} pos
 * @param {Vector} geodetic
 */
calculateLatLonAlt = (time, pos, geodetic) => {
    let phi; let sinPhi; let c;

    geodetic.theta  = PredictMath.acTan(pos.y, pos.x);
    geodetic.lon    = PredictMath.fMod2p(geodetic.theta - Time.thetaGJD(time));

    const r         = Math.sqrt((pos.x * pos.x) + (pos.y * pos.y));
    const e2        = Constants.__f * (2 - Constants.__f);

    geodetic.lat    = PredictMath.acTan(pos.z, r);

    do {
        phi         = geodetic.lat;
        sinPhi      = Math.sin(phi);
        c           = 1 / Math.sqrt(1 - e2 * (sinPhi * sinPhi));
        geodetic.lat = PredictMath.acTan(pos.z + Constants.xkmper * c * e2 *
            sinPhi, r,
        );
    } while (Math.abs(geodetic.lat - phi) >= 1e-10);

    geodetic.alt = r / Math.cos(geodetic.lat) - Constants.xkmper * c;

    if (geodetic.lat > Constants.pio2) {
        geodetic.lat -= Constants.twopi;
    }
};

/**
 * Calculate the topocentric coordinates of the object with ECI position {pos}
 * and velocity {vel}, from location {geodetic} at {time}. The {obs_set}
 * returned for this function consists of azimuth, elevation, range, and range
 * rate (in that order) with units of radians, radians, kilometers and
 * kilometers/second, respectively. The WGS '72 geoid is used and the effect of
 * atmospheric refraction (under standard temperature and pressure) is
 * incorporated into the elevation calculation; the effect of atmospheric
 * refraction on range and range_rate has not yet been quantified.
 *
 * @param {number} time
 * @param {Vector} pos
 * @param {Vector} vel
 * @param {Geodetic} geodetic
 * @param {ObsSet} obs_set
 */
calculateObs = (time, pos, vel, geodetic, obs_set) => {
    const obs_pos = new Vector();
    const obs_vel = new Vector();
    const range   = new Vector();
    const rgvel   = new Vector();

    let azim;

    calculateUserPosVel(time, geodetic, obs_pos, obs_vel);

    range.x = pos.x - obs_pos.x;
    range.y = pos.y - obs_pos.y;
    range.z = pos.z - obs_pos.z;

    rgvel.x = vel.x - obs_vel.x;
    rgvel.y = vel.y - obs_vel.y;
    rgvel.z = vel.z - obs_vel.z;

    range.w = Math.sqrt(range.x * range.x + range.y * range.y + range.z *
        range.z,
    );

    const sin_lat   = Math.sin(geodetic.lat);
    const cos_lat   = Math.cos(geodetic.lat);
    const sin_theta = Math.sin(geodetic.theta);
    const cos_theta = Math.cos(geodetic.theta);
    const top_s     = sin_lat * cos_theta * range.x +
                    sin_lat * sin_theta * range.y -
                    cos_lat * range.z;
    const top_e     = -sin_theta * range.x +
                    cos_theta * range.y;
    const top_z     = cos_lat * cos_theta * range.x +
                    cos_lat * sin_theta * range.y +
                    sin_lat * range.z;
    azim            = Math.atan(-top_e / top_s); /* Azimuth */

    if (top_s > 0) {
        azim = azim + Constants.pi;
    }

    if (azim < 0) {
        azim = azim + Constants.twopi;
    }

    const el = Math.asin(top_z / range.w);

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
};

/**
 * The {obs_set} for this function consists of right ascension and declination
 * (in that order) in radians. Calculations are based on topocentric position
 * using the WGS '72 geoid and incorporating atmospheric refraction.
 *
 * @param {number} time
 * @param {Vector} obs_pos
 * @param {Vector} obs_vel
 * @param {Geodetic} geodetic
 * @param {ObsSet} obs_set
 */
calculateRADecObs = (time, obs_pos, obs_vel, geodetic, obs_set) => {
    calculateObs(time, obs_pos, obs_vel, geodetic, obs_set);

    const az      = obs_set.az;
    const el      = obs_set.el;
    const phi     = geodetic.lat;
    const theta   = PredictMath.fMod2p(Time.thetaGJD(time) + geodetic.lon);
    const sin_theta = Math.sin(theta);
    const cos_theta = Math.cos(theta);
    const sin_phi = Math.sin(phi);
    const cos_phi = Math.cos(phi);
    const Lxh     = -Math.cos(az) * Math.cos(el);
    const Lyh     = Math.sin(az) * Math.cos(el);
    const Lzh     = Math.sin(el);

    const Sx      = sin_phi * cos_theta;
    const Ex      = -sin_theta;
    const Zx      = cos_theta * cos_phi;

    const Sy      = sin_phi * sin_theta;
    const Ey      = cos_theta;
    const Zy      = sin_theta * cos_phi;

    const Sz      = -cos_phi;
    const Ez      = 0;
    const Zz      = sin_phi;

    const Lx      = Sx * Lxh + Ex * Lyh + Zx * Lzh;
    const Ly      = Sy * Lxh + Ey * Lyh + Zy * Lzh;
    const Lz      = Sz * Lxh + Ez * Lyh + Zz * Lzh;

    obs_set.dec = Math.asin(Lz);

    /* Declination (radians) */
    const cos_delta = Math.sqrt(1 - Math.pow(Lz, 2));
    const sin_alpha = Ly / cos_delta;
    const cos_alpha = Lx / cos_delta;

    /* Right Ascension (radians) */
    obs_set.ra = PredictMath.acTan(sin_alpha, cos_alpha);
    obs_set.ra = PredictMath.fMod2p(obs_set.ra);
};

module.exports = {
    calculateUserPosVel,
    calculateLatLonAlt,
    calculateObs,
    calculateRADecObs,
};
