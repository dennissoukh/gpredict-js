const Constants     = require('./Constants');
const PredictMath   = require('./Math');
const Vector        = require('./Vector');
const Geodetic      = require('./Geodetic');
const ObsSet        = require('./ObsSet');
const SGSDPStatic   = require('./SGSDPStatic');
const DeepArg       = require('./DeepArg');
const DeepStatic    = require('./DeepStatic');
const SGPSDP        = require('./SGPSDP');
const Time          = require('./Time');
const SGPObs        = require('./SGPObs');
const Solar         = require('./Solar');

/**
 * Contains satellite data and related methods.
 */
class PredictSat {
    // Fifth root of a hundred, used for magnitude calculation
    POGSONS_RATIO = 2.5118864315096;

    name        = null;
    nickname    = null;

    tle         = null;  /* Keplerian elements */
    flags       = 0;     /* Flags for algo ctrl */
    sgps        = null;
    dps         = null;
    deep_arg    = null;
    pos         = null;  /* Raw position and range */
    vel         = null;  /* Raw velocity */

    /* time keeping fields */
    jul_epoch   = null;
    jul_utc     = null;
    tsince      = null;
    aos         = null;   /* Next AOS. */
    los         = null;   /* Next LOS */

    az          = null;   /* Azimuth [deg] */
    el          = null;   /* Elevation [deg] */
    range       = null;   /* Range [km] */
    range_rate  = null;   /* Range Rate [km/sec] */
    ra          = null;   /* Right Ascension [deg] */
    dec         = null;   /* Declination [deg] */
    ssplat      = null;   /* SSP latitude [deg] */
    ssplon      = null;   /* SSP longitude [deg] */
    alt         = null;   /* altitude [km] */
    velo        = null;   /* velocity [km/s] */
    ma          = null;   /* mean anomaly */
    footprint   = null;   /* footprint */
    phase       = null;   /* orbit phase */
    meanmo      = null;   /* mean motion kept in rev/day */
    orbit       = null;   /* orbit number */
    otype       = null;   /* orbit type. */

    sgpsdp      = new SGPSDP();

    /**
     * Constructor for the PredictSat class.
     * @param {object} tle
     */
    constructor(tle) {
        const headerParts   = tle.header.split(' ');
        this.name           = headerParts[0];
        this.nickname       = headerParts[0];
        this.tle            = tle;
        this.pos            = new Vector();
        this.vel            = new Vector();
        this.sgps           = new SGSDPStatic();
        this.deep_arg       = new DeepArg();
        this.dps            = new DeepStatic(),

        this.selectEphemeris();
        this.satDataInit(this);
    }

    /**
     * Selects the appropriate ephemeris type to be used for predictions
     * according to the data in the TLE. It also processes values in the
     * TLE set so that they are appropriate for the SGP4/SDP4 routines.
     */
    selectEphemeris = () => {
        let temp; let dd1;

        /* Preprocess tle set */
        this.tle.xnodeo    *= Constants.de2ra;
        this.tle.omegao    *= Constants.de2ra;
        this.tle.xmo       *= Constants.de2ra;
        this.tle.xincl     *= Constants.de2ra;
        temp = Constants.twopi / Constants.xmnpda / Constants.xmnpda;

        /* store mean motion before conversion */
        this.meanmo         = this.tle.xno;
        this.tle.xno        = this.tle.xno * temp * Constants.xmnpda;
        this.tle.xndt2o    *= temp;
        this.tle.xndd6o     = this.tle.xndd6o * temp / Constants.xmnpda;
        this.tle.bstar     /= Constants.ae;

        /* Period > 225 minutes is deep space */
        dd1         = Constants.xke / this.tle.xno;
        const dd2   = Constants.tothrd;
        const a1    = Math.pow(dd1, dd2);
        const r1    = Math.cos(this.tle.xincl);
        dd1         = 1.0 - this.tle.eo * this.tle.eo;
        temp        = Constants.ck2 * 1.5 * (r1 * r1 * 3.0 - 1.0) /
                    Math.pow(dd1, 1.5);
        const del1  = temp / (a1 * a1);
        const ao    = a1 * (1.0 - del1 * (Constants.tothrd * 0.5 + del1 *
                    (del1 * 1.654320987654321 + 1.0)));
        const delo  = temp / (ao * ao);
        const xnodp = this.tle.xno / (delo + 1.0);

        if (Constants.twopi / xnodp / Constants.xmnpda >= .15625) {
            this.flags |= this.sgpsdp.DEEP_SPACE_EPHEM_FLAG;
        } else {
            this.flags &= ~this.sgpsdp.DEEP_SPACE_EPHEM_FLAG;
        }
    }

    /**
     * Initialise the satellite data.
     * This function calculates the satellite data at t = 0, ie. epoch
     * time. The function is called automatically by gtk_sat_data_read_sat.
     *
     * @param {PredictSat} sat
     * @param {QTH} qth
     */
    satDataInit = (sat, qth = null) => {
        const obs_geodetic    = new Geodetic();
        const obs_set         = new ObsSet();
        const sat_geodetic    = new Geodetic();
        const jul_utc         = Time.julianDateOfEpoch(sat.tle.epoch);

        sat.jul_epoch       = jul_utc;

        // Initialise observer location
        if (qth != null) {
            obs_geodetic.lon    = qth.lon * Constants.de2ra;
            obs_geodetic.lat    = qth.lat * Constants.de2ra;
            obs_geodetic.alt    = qth.alt / 1000.0;
            obs_geodetic.theta  = 0;
        } else {
            obs_geodetic.lon    = 0.0;
            obs_geodetic.lat    = 0.0;
            obs_geodetic.alt    = 0.0;
            obs_geodetic.theta  = 0;
        }

        // Execute computations
        if (sat.flags & this.sgpsdp.DEEP_SPACE_EPHEM_FLAG) {
            this.sgpsdp.sdp4(sat, 0.0);
        } else {
            this.sgpsdp.sgp4(sat, 0.0);
        }

        // Scale position and velocity to km and km/sec
        PredictMath.convertSatState(sat.pos, sat.vel);

        sat.vel.w = Math.sqrt(sat.vel.x * sat.vel.x + sat.vel.y * sat.vel.y +
            sat.vel.z * sat.vel.z);
        sat.velo  = sat.vel.w;

        SGPObs.calculateObs(jul_utc, sat.pos, sat.vel, obs_geodetic, obs_set);
        SGPObs.calculateLatLonAlt(jul_utc, sat.pos, sat_geodetic);

        while (sat_geodetic.lon < -Constants.pi) {
            sat_geodetic.lon += Constants.twopi;
        }

        while (sat_geodetic.lon > Constants.pi) {
            sat_geodetic.lon -= Constants.twopi;
        }

        sat.az          = PredictMath.degrees(obs_set.az);
        sat.el          = PredictMath.degrees(obs_set.el);
        sat.range       = obs_set.range;
        sat.range_rate  = obs_set.range_rate;
        sat.ssplat      = PredictMath.degrees(sat_geodetic.lat);
        sat.ssplon      = PredictMath.degrees(sat_geodetic.lon);
        sat.alt         = sat_geodetic.alt;
        sat.ma          = PredictMath.degrees(sat.phase);
        sat.ma         *= 256.0 / 360.0;
        sat.footprint   = 2.0 * Constants.xkmper *
                        Math.acos(Constants.xkmper / sat.pos.w);
        const age       = 0.0;
        sat.orbit       = Math.floor((sat.tle.xno * Constants.xmnpda /
                        Constants.twopi + age * sat.tle.bstar *
                        Constants.ae) * age + sat.tle.xmo / Constants.twopi) +
                        sat.tle.revnum - 1;

        /* orbit type */
        sat.otype = sat.getOrbitType(sat);
    }

    /**
     * Get the orbit type of the satellite.
     *
     * @param {PredictSat} sat
     * @return {number}
     */
    getOrbitType = (sat) => {
        let orbit = this.sgpsdp.ORBIT_TYPE_UNKNOWN;

        if (this.geostationary(sat)) {
            orbit = this.sgpsdp.ORBIT_TYPE_GEO;
        } else if (this.decayed(sat)) {
            orbit = this.sgpsdp.ORBIT_TYPE_DECAYED;
        } else {
            orbit = this.sgpsdp.ORBIT_TYPE_UNKNOWN;
        }

        return orbit;
    }

    /**
     * Determinte whether satellite is in geostationary orbit.
     *
     * @param {PredictSat} sat
     * @return {boolean}
     */
    geostationary = (sat) => {
        return Math.abs(sat.meanmo - 1.0027) < 0.0002;
    }

    /**
     * Determine whether satellite has decayed.
     *
     * @param {PredictSat} sat
     * @return {boolean}
     */
    decayed = (sat) => {
        return sat.jul_epoch + ((16.666666 - sat.meanmo) /
            (10.0 * Math.abs(sat.tle.xndt2o / (Constants.twopi /
            Constants.xmnpda / Constants.xmnpda)))) < sat.jul_utc;
    }

    /**
     * Experimental attempt at calculating apparent magnitude. Known intrinsic
     * magnitudes are listed inside the function for now.
     *
     * @param {number} time
     * @param {QTH} qth
     * @return {number|null}
     */
    calculateApparentMagnitude = (time, qth) => {
        const intrinsicMagnitudes = {
            25544: {
                mag     : -1.3,
                illum   : .5,
                distance: 1000,
            },
        };

        // Return null if we don't have a record of the intrinsic mag
        if (!intrinsicMagnitudes.hasOwnProperty(this.tle.catnr)) {
            return null;
        }

        // Convert observer geodetic info to radians and km to compare vectors
        const imag        = intrinsicMagnitudes[this.tle.catnr];
        const observerGeo = new Geodetic();

        observerGeo.lat = PredictMath.radians(qth.lat);
        observerGeo.lon = PredictMath.radians(qth.lon);
        observerGeo.alt = qth.alt * 1000;

        const observerPos = new Vector();
        const observerVel = new Vector();
        const solarVector = new Vector();

        Solar.calculateSolarPosition(time, solarVector);
        SGPObs.calculateUserPosVel(time, observerGeo, observerPos, observerVel);

        // Determine the solar phase and then the percent illumination
        const observerSatPos = new Vector();

        PredictMath.vecSub(this.pos, observerPos, observerSatPos);
        const phaseAngle  = PredictMath.degrees(
            PredictMath.angle(solarVector, observerSatPos),
        );
        const illum       = phaseAngle / 180;

        const illuminationChange              = illum / imag.illum;
        const inverseSquareOfDistanceChange   = Math.pow((imag.distance /
            this.range), 2,
        );
        const changeInMagnitude               = (Math.log(illuminationChange *
            inverseSquareOfDistanceChange) / Math.log(this.POGSONS_RATIO)
        );

        return (imag.mag - changeInMagnitude);
    }
}

module.exports = PredictSat;
