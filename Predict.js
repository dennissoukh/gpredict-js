const Vector        = require('./src/Vector');
const Geodetic      = require('./src/Geodetic');
const ObsSet        = require('./src/ObsSet');
const Time          = require('./src/Time');
const Maths         = require('./src/Math');
const SGPObs        = require('./src/SGPObs');
const Solar         = require('./src/Solar');
const Pass          = require('./src/Pass');
const PassDetail    = require('./src/PassDetail');
const Constants     = require('./src/Constants');
const Utils         = require('./src/Utils');

/**
 * The main Predict class.
 */
class Predict {
    /* visibility constants */
    SAT_VIS_NONE     = 0;
    SAT_VIS_VISIBLE  = 1;
    SAT_VIS_DAYLIGHT = 2;
    SAT_VIS_ECLIPSED = 3;

    /* preferences */
    minEle          = 10
    timeRes         = 10;   // Pass details: time resolution
    numEntries      = 20;   // Pass details: number of entries
    threshold       = -6;   // Twilight threshold

    /**
     * Predict the next pass.
     * @param {PredictSat}  sat     Satellite data
     * @param {PredictQTH}  qth     QTH Data
     * @param {number}      maxdt   Period of time to calculate passes for
     * @return {PredictPass|null}
     */
    getNextPass = (sat, qth, maxdt) => {
        const now = Time.getCurrentDayNumber();
        return this.getPass(sat, qth, now, maxdt);
    }

    /**
     * Predict first pass after a certain time. This function will find the
     * first upcoming pass with AOS no earlier than t = start and no later than
     * t = (start + maxdt). For no time limit use maxdt = 0.0.
     *
     * @param {PredictSat}  sat_in  Satellite
     * @param {PredictQTH}  qth     QTH Data
     * @param {number}      start   Start Time
     * @param {number}      maxdt   Period of time to calculate passes for
     * @return {PredictPass|null}
     */
    getPass = (sat_in, qth, start, maxdt) => {
        let aos     = 0.0;      /* time of AOS */
        let tca     = 0.0;      /* time of TCA */
        let los     = 0.0;      /* time of LOS */
        let dt      = 0.0;      /* time diff */
        let step    = 0.0;      /* time step */
        let t0      = start;
        let tres    = 0.0;      /* required time resolution */
        let max_el  = 0.0;      /* maximum elevation */
        let pass    = null;
        let detail  = null;
        let done    = false;

        // Copy sat to a working structure
        const sat         = sat_in;

        // Get time resolution in seconds
        tres            = this.timeRes / 86400.0;

        // Loop until pass found with elevation > selected min elevation
        while (!done) {
            // Find los of next pass or of current pass
            // See if a pass is ongoing
            los         = this.findLos(sat, qth, t0, maxdt);
            aos         = this.findAos(sat, qth, t0, maxdt);

            if (aos > los) {
                // los is from an currently happening pass, find previous aos
                aos = this.findPrevAos(sat, qth, t0);
            }

            // aos = 0.0 means no aos
            if (aos === 0.0) {
                done = true;
            } else if ((maxdt > 0.0) && (aos > (start + maxdt)) ) {
                // Check if within time limits; maxdt = 0.0 means no limit
                done = true;
            } else {
                dt = los - aos;

                // Get time step, which will give the max number of entries
                step = dt / this.numEntries;

                // If step is smaller than resolution, go with resolution
                if (step < tres) {
                    step = tres;
                }

                pass = new Pass();

                pass.aos      = aos;
                pass.los      = los;
                pass.max_el   = 0.0;
                pass.aos_az   = 0.0;
                pass.los_az   = 0.0;
                pass.maxel_az = 0.0;
                pass.vis      = '---';
                pass.satname  = sat.nickname;
                pass.details  = [];

                // Iterate over each time stemp
                for (let t = pass.aos; t <= pass.los; t += step) {
                    // Calculate satellite data
                    this.predictCalc(sat, qth, t);

                    // In the first iter, store pass.aos_az
                    if (t === pass.aos) {
                        pass.aos_az = sat.az;
                        pass.orbit  = sat.orbit;
                    }

                    // Append details to sat.details
                    detail              = new PassDetail();
                    detail.time         = t;
                    detail.pos.x        = sat.pos.x;
                    detail.pos.y        = sat.pos.y;
                    detail.pos.z        = sat.pos.z;
                    detail.pos.w        = sat.pos.w;
                    detail.vel.x        = sat.vel.x;
                    detail.vel.y        = sat.vel.y;
                    detail.vel.z        = sat.vel.z;
                    detail.vel.w        = sat.vel.w;
                    detail.velo         = sat.velo;
                    detail.az           = sat.az;
                    detail.el           = sat.el;
                    detail.range        = sat.range;
                    detail.range_rate   = sat.range_rate;
                    detail.lat          = sat.ssplat;
                    detail.lon          = sat.ssplon;
                    detail.alt          = sat.alt;
                    detail.ma           = sat.ma;
                    detail.phase        = sat.phase;
                    detail.footprint    = sat.footprint;
                    detail.orbit        = sat.orbit;
                    detail.vis          = this.getSatVis(sat, qth, t);

                    // Store visibility character
                    switch (detail.vis) {
                    case this.SAT_VIS_VISIBLE:
                        pass.vis = Utils.replaceAt(pass.vis, 0, 'V');
                        break;
                    case this.SAT_VIS_DAYLIGHT:
                        pass.vis = Utils.replaceAt(pass.vis, 1, 'D');
                        break;
                    case this.SAT_VIS_ECLIPSED:
                        pass.vis = Utils.replaceAt(pass.vis, 2, 'E');
                        break;
                    default:
                        break;
                    }

                    pass.details.push(detail);

                    // Look up apparent magnitude if this is a visible pass
                    if (detail.vis === this.SAT_VIS_VISIBLE) {
                        const apmag = sat.calculateApparentMagnitude(t, qth);
                        if (pass.max_apparent_magnitude === null ||
                            apmag < pass.max_apparent_magnitude) {
                            pass.max_apparent_magnitude = apmag;
                        }
                    }

                    // Store elevation if greater than the previosly stored one
                    if (sat.el > max_el) {
                        max_el          = sat.el;
                        tca             = t;
                        pass.maxel_az   = sat.az;
                    }
                }

                // Calculate satellite data
                this.predictCalc(sat, qth, pass.los);

                // Store los_az, max_el & tca
                pass.los_az = sat.az;
                pass.max_el = max_el;
                pass.tca    = tca;

                // Check whether this pass is good
                if (max_el >= this.minEle) {
                    done = true;
                } else {
                    done = false;
                    t0 = los + 0.014; // +20 min
                    pass = null;
                }
            }
        }

        return pass;
    }

    /**
     * Calculate the satellite visibility.
     * @param {PredictSat}  sat
     * @param {PredictQTH}  qth
     * @param {number}      jul_utc
     * @return {number} The visiblity constant (0, 1, 2, or 3)
     */
    getSatVis = (sat, qth, jul_utc) => {
        const eclipse_depth  = 0.0;
        const zero_vector    = new Vector();
        const obs_geodetic   = new Geodetic();

        /* Solar ECI position vector  */
        const solar_vector    = new Vector();

        /* Solar observed az and el vector  */
        const solar_set       = new ObsSet();

        /* FIXME: could be passed as parameter */
        obs_geodetic.lon   = qth.lon * Constants.de2ra;
        obs_geodetic.lat   = qth.lat * Constants.de2ra;
        obs_geodetic.alt   = qth.alt / 1000.0;
        obs_geodetic.theta = 0;

        Solar.calculateSolarPosition(jul_utc, solar_vector);
        SGPObs.calculateObs(jul_utc, solar_vector, zero_vector, obs_geodetic,
            solar_set);

        let vis;
        const sat_sun_status = !Solar.satEclipsed(sat.pos, solar_vector,
            eclipse_depth);

        if (sat_sun_status) {
            const sun_el = Maths.degrees(solar_set.el);

            if (sun_el <= this.threshold && sat.el >= 0.0) {
                vis = this.SAT_VIS_VISIBLE;
            } else {
                vis = this.SAT_VIS_DAYLIGHT;
            }
        } else {
            vis = this.SAT_VIS_ECLIPSED;
        }

        return vis;
    }

    /**
     * Find the AOS time of the next pass. This function finds the time of AOS
     * for the first coming pass taking place no earlier then start. If the
     * satellite is currently within range, the function first calls findLos to
     * get the next LOS time. Then the calculations are done using the new
     * start time.
     *
     * @param {PredictSat}  sat
     * @param {PredictQTH}  qth
     * @param {number}      start
     * @param {number}      maxdt
     * @return {number} The Julian date of the next AOS or 0.0 if the satellite
     * has no AOS.
     */
    findAos = (sat, qth, start, maxdt) => {
        let t       = start;
        let aostime = 0.0;

        /* make sure current sat values are
            in sync with the time
        */
        this.predictCalc(sat, qth, start);

        /* check whether satellite has aos */
        if ((sat.otype === sat.sgpsdp.ORBIT_TYPE_GEO) ||
            (sat.otype === sat.sgpsdp.ORBIT_TYPE_DECAYED) ||
            !this.hasAos(sat, qth)) {
            return 0.0;
        }

        if (sat.el > 0.0) {
            t = this.findLos(sat, qth, start, maxdt) + 0.014; // +20 min
        }

        /* invalid time (potentially returned by findLos) */
        if (t < 0.1) {
            return 0.0;
        }

        /* update satellite data */
        this.predictCalc(sat, qth, t);

        /* use upper time limit */

        if (maxdt > 0.0) {
            /* coarse time steps */
            while ((sat.el < -1.0) && (t <= (start + maxdt))) {
                t -= 0.00035 * (sat.el * ((sat.alt / 8400.0) + 0.46) - 2.0);
                this.predictCalc(sat, qth, t);
            }

            /* fine steps */
            while ((aostime === 0.0) && (t <= (start + maxdt))) {
                if (Math.abs(sat.el) < 0.005) {
                    aostime = t;
                } else {
                    t -= sat.el * Math.sqrt(sat.alt) / 530000.0;
                    this.predictCalc(sat, qth, t);
                }
            }
        } else {
            /* don't use upper time limit */
            /* coarse time steps */
            while (sat.el < -1.0) {
                t -= 0.00035 * (sat.el * ((sat.alt / 8400.0) + 0.46) - 2.0);

                this.predictCalc(sat, qth, t);
            }

            /* fine steps */
            while (aostime === 0.0) {
                if (Math.abs(sat.el) < 0.005) {
                    aostime = t;
                } else {
                    t -= sat.el * Math.sqrt(sat.alt) / 530000.0;
                    this.predictCalc(sat, qth, t);
                }
            }
        }

        return aostime;
    }

    /**
     * The SGP4SDP4 driver for doing AOS/LOS calculations.
     *
     * @param {PredictSat}  sat Satellite
     * @param {PredictQTH}  qth QTH
     * @param {number}      t   Time for calculation
     */
    predictCalc = (sat, qth, t) => {
        const obs_set         = new ObsSet;
        const sat_geodetic    = new Geodetic;
        const obs_geodetic    = new Geodetic;

        obs_geodetic.lon    = qth.lon * Constants.de2ra;
        obs_geodetic.lat    = qth.lat * Constants.de2ra;
        obs_geodetic.alt    = qth.alt / 1000.0;
        obs_geodetic.theta  = 0;

        sat.jul_utc         = t;
        sat.tsince          = (sat.jul_utc - sat.jul_epoch) * Constants.xmnpda;

        // Call the NORAD routines according to the deep-space flag
        if (sat.flags & sat.sgpsdp.DEEP_SPACE_EPHEM_FLAG) {
            sat.sgpsdp.sdp4(sat, sat.tsince);
        } else {
            sat.sgpsdp.sgp4(sat, sat.tsince);
        }

        Maths.convertSatState(sat.pos, sat.vel);

        // Get the velocity of the satellite
        sat.vel.w   = Math.sqrt(sat.vel.x * sat.vel.x + sat.vel.y * sat.vel.y +
             sat.vel.z * sat.vel.z);
        sat.velo    = sat.vel.w;

        SGPObs.calculateObs(sat.jul_utc, sat.pos, sat.vel, obs_geodetic,
            obs_set);
        SGPObs.calculateLatLonAlt(sat.jul_utc, sat.pos, sat_geodetic);

        while (sat_geodetic.lon < -Constants.pi) {
            sat_geodetic.lon += Constants.twopi;
        }

        while (sat_geodetic.lon > (Constants.pi)) {
            sat_geodetic.lon -= Constants.twopi;
        }

        sat.az          = Maths.degrees(obs_set.az);
        sat.el          = Maths.degrees(obs_set.el);
        sat.range       = obs_set.range;
        sat.range_rate  = obs_set.range_rate;
        sat.ssplat      = Maths.degrees(sat_geodetic.lat);
        sat.ssplon      = Maths.degrees(sat_geodetic.lon);
        sat.alt         = sat_geodetic.alt;
        sat.ma          = Maths.degrees(sat.phase);
        sat.ma         *= 256.0 / 360.0;
        sat.phase       = Maths.degrees(sat.phase);

        sat.footprint   = 12756.33 * Math.acos(Constants.xkmper /
            (Constants.xkmper + sat.alt));

        const age     = sat.jul_utc - sat.jul_epoch;

        sat.orbit   = Math.floor((sat.tle.xno * Constants.xmnpda /
            Constants.twopi + age * sat.tle.bstar * Constants.ae) * age +
            sat.tle.xmo / Constants.twopi) + sat.tle.revnum - 1;
    }

    /**
     * Find the LOS time of the next pass. This function find the time of LOS
     * for the first coming pass taking place no earlier than start. If the
     * satellite is currently out of range, the function first calls find_aos
     * to get the next AOS time. Then the calculations are done using the new
     * start time.
     *
     * @param {PredictSat}  sat Satellite
     * @param {PredictQTH}  qth QTH
     * @param {number}  start   The time at which the calculation should start
     * @param {number}  maxdt   The upper time limit in days (0.0 = no limit)
     * @return {number}
     */
    findLos = (sat, qth, start, maxdt) => {
        let t       = start;
        let lostime = 0.0;

        this.predictCalc(sat, qth, start);

        /* check whether satellite has aos */
        if ((sat.otype === sat.sgpsdp.ORBIT_TYPE_GEO) ||
            (sat.otype === sat.sgpsdp.ORBIT_TYPE_DECAYED) ||
            !this.hasAos(sat, qth)) {
            return 0.0;
        }

        if (sat.el < 0.0) {
            t = this.findAos(sat, qth, start, maxdt) + 0.001; // +1.5 min
        }

        /* invalid time (potentially returned by findAos) */
        if (t < 0.01) {
            return 0.0;
        }

        /* update satellite data */
        this.predictCalc(sat, qth, t);

        /* use upper time limit */
        if (maxdt > 0.0) {
            /* coarse steps */
            while ((sat.el >= 1.0) && (t <= (start + maxdt))) {
                t += Math.cos((sat.el - 1.0) * Constants.de2ra) *
                Math.sqrt(sat.alt) / 25000.0;
                this.predictCalc(sat, qth, t);
            }

            /* fine steps */
            while ((lostime === 0.0) && (t <= (start + maxdt)))  {
                t += sat.el * Math.sqrt(sat.alt) / 502500.0;
                this.predictCalc(sat, qth, t);

                if (Math.abs(sat.el) < 0.005) {
                    lostime = t;
                }
            }
        } else {
            /* don't use upper limit */

            /* coarse steps */
            while (sat.el >= 1.0) {
                t += Math.cos((sat.el - 1.0) * Constants.de2ra) *
                Math.sqrt(sat.alt) / 25000.0;
                this.predictCalc(sat, qth, t);
            }

            /* fine steps */
            while (lostime === 0.0) {
                t += sat.el * Math.sqrt(sat.alt) / 502500.0;
                this.predictCalc(sat, qth, t);

                if (Math.abs(sat.el) < 0.005) {
                    lostime = t;
                }
            }
        }
        return lostime;
    }

    /**
     * Find AOS time of the current pass. This function can be used to find
     * the AOS time in the past of the current pass.
     *
     * @param {PredictSat}  sat     Satellite
     * @param {PredictQTH}  qth     QTH
     * @param {number}      start   Start time
     * @return {number}
     */
    findPrevAos = (sat, qth, start) => {
        let aostime = start;

        /* make sure current sat values are
             in sync with the time
         */
        this.predictCalc(sat, qth, start);

        /* check whether satellite has aos */
        if ((sat.otype === sat.sgpsdp.ORBIT_TYPE_GEO) ||
            (sat.otype === sat.sgpsdp.ORBIT_TYPE_DECAYED) ||
            !this.hasAos(sat, qth)) {
            return 0.0;
        }

        while (sat.el >= 0.0) {
            aostime -= 0.0005; // 0.75 min
            this.predictCalc(sat, qth, aostime);
        }

        return aostime;
    }

    /**
     * Check if a satellite has AOS.
     *
     * @param {PredictSat} sat
     * @param {PredictQTH} qth
     * @return {boolean}
     */
    hasAos = (sat, qth) => {
        let retcode;

        if (sat.meanmo === 0.0) {
            retcode = false;
        } else {
            let lin = sat.tle.xincl;

            if (lin >= Constants.pio2) {
                lin = Constants.pi - lin;
            }

            const sma = 331.25 * Math.exp(Math.log(1440.0 / sat.meanmo) *
                (2.0 / 3.0));

            const apogee = sma * (1.0 + sat.tle.eo) - Constants.xkmper;

            retcode = (Math.acos(Constants.xkmper / (apogee +
                Constants.xkmper)) + (lin)) >
                Math.abs(qth.lat * Constants.de2ra);
        }

        return retcode;
    }

    /**
     * Predict passes after a certain time. This function calculates the num of
     * uncoming passes with AOS no earlier than t = start and not later than
     * t = (start + maxdt). The function will repeatedly call get_pass until
     * the number of predicted passes is equal to num, the time has reached
     * limit or get_pass returns null. For no time limit use maxdt = 0.0.
     *
     * @param {PredictSat} sat
     * @param {PredictQTH} qth
     * @param {number} start
     * @param {number} maxdt
     * @param {number} num
     * @return {array}
     */
    getPasses = (sat, qth, start, maxdt, num = 10) => {
        const passes = []; let i; let t; let pass;

        t = start;

        for (i = 0; i < num; i++) {
            pass = this.getPass(sat, qth, t, maxdt);

            if (pass != null) {
                passes.push(pass);

                // +20 min
                t = pass.los + 0.014;

                // If maxdt > 0.0 check if t = start + maxdt reached
                if ((maxdt > 0.0) && (t >= (start + maxdt))) {
                    i = num;
                }
            } else {
                // No more passes available
                i = num;
            }
        }

        return passes;
    }

    /**
     * Filter passes by whether they'll be visible.
     *
     * @param {array} passes
     * @return {array}
     */
    filterVisiblePasses = (passes) => {
        const filtered = []; let aos; let aos_az; let tca; let los_az;
        let max_el; let aos_el; let los; let los_el; let max_el_az;

        passes.forEach((pass) => {
            if (pass.vis.substring(0, 1) !== 'V') {
                return;
            }

            aos    = false;
            aos_az = false;
            aos    = false;
            tca    = false;
            los_az = false;
            max_el = 0;

            pass.details.forEach((detail) => {
                if (detail.vis !== this.SAT_VIS_VISIBLE) {
                    return;
                }
                if (detail.el < this.minEle) {
                    return;
                }

                if (aos === false) {
                    aos       = detail.time;
                    aos_az    = detail.az;
                    aos_el    = detail.el;
                    tca       = detail.time;
                    los       = detail.time;
                    los_az    = detail.az;
                    los_el    = detail.el;
                    max_el    = detail.el;
                    max_el_az = detail.el;
                    return;
                }
                los    = detail.time;
                los_az = detail.az;
                los_el = detail.el;

                if (detail.el > max_el) {
                    tca             = detail.time;
                    max_el          = detail.el;
                    max_el_az       = detail.az;
                }
            });

            if (aos === false) {
                // Does not reach minimum elevation, skip
                return;
            }

            pass.visible_aos       = aos;
            pass.visible_aos_az    = aos_az;
            pass.visible_aos_el    = aos_el;
            pass.visible_tca       = tca;
            pass.visible_max_el    = max_el;
            pass.visible_max_el_az = max_el_az;
            pass.visible_los       = los;
            pass.visible_los_az    = los_az;
            pass.visible_los_el    = los_el;

            filtered.push(pass);
        });

        return filtered;
    }

    /**
     * Convert az to a compass direction.
     *
     * @param {number} az
     * @return {string}
     */
    azDegreesToDirection = (az = 0) => {
        let i = Math.floor(az / 22.5);
        const m = (22.5 * (2 * i + 1)) / 2;

        i = (az >= m) ? i + 1 : i;

        // return trim(substr('N  NNENE ENEE  ESESE SSES  SSWSW WSWW
        // WNWNW NNWN  ', i * 3, 3));
        return 'test string';
    }
}

module.exports = Predict;
