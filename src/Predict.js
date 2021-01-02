const Vector        = require('./Vector');
const SGSDPStatic   = require('./SGSDPStatic');
const DeepArg       = require('./DeepArg');
const DeepStatic    = require('./DeepStatic');
const SGPSDP        = require('./SGPSDP');
const Geodetic      = require('./Geodetic');
const ObsSet        = require('./ObsSet');
const Time          = require('./Time');
const Maths         = require('./Math');
const SGPObs        = require('./SGPObs');
const Solar         = require('./Solar');
const Pass          = require('./Pass');
const PassDetail    = require('./PassDetail');
const Constants     = require('./Constants');
const Utils         = require('./Utils');

class Predict
{
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

    sgpsdp          = new SGPSDP();

    testTime        = 2459215.623526;

    /**
     *  Predict the next pass.
     *
     * This function simply wraps the get_pass function using the current time
     * as parameter.
     *
     * Note: the data in sat will be corrupt (future) and must be refreshed
     *       by the caller, if the caller will need it later on (eg. if the caller
     *       is GtkSatList).
     *
     *
     * @return Predict_Pass Pointer instance or NULL if no pass can be
     *         found.
     */
    getNextPass = (sat, qth, maxdt) =>
    {
        const now = Time.getCurrentDayNumber();
        return this.getPass(sat, qth, now, maxdt);
    }

    /** Predict first pass after a certain time.
     *
     *  @return Predict_Pass or NULL if there was an error.
     *
     * This function will find the first upcoming pass with AOS no earlier than
     * t = start and no later than t = (start+maxdt).
     *
     *  note For no time limit use maxdt = 0.0
     *
     *  note the data in sat will be corrupt (future) and must be refreshed
     *       by the caller, if the caller will need it later on
     */
    getPass = (sat_in, qth, start, maxdt) =>
    {
        let aos     = 0.0,      /* time of AOS */
            tca     = 0.0,      /* time of TCA */
            los     = 0.0,      /* time of LOS */
            dt      = 0.0,      /* time diff */
            step    = 0.0,      /* time step */
            t0      = start,
            tres    = 0.0,      /* required time resolution */
            max_el  = 0.0,      /* maximum elevation */
            pass    = null,
            detail  = null,
            done    = false,
            iter    = 0;        /* number of iterations */

        /* FIXME: watchdog */

        /*copy sat_in to a working structure*/
        let sat         = sat_in,
            sat_working = sat_in;

        /* get time resolution; sat-cfg stores it in seconds */
        tres            = this.timeRes / 86400.0;

        /* loop until we find a pass with elevation > SAT_CFG_INT_PRED_MIN_EL
            or we run out of time
            FIXME: we should have a safety break
        */
        while (!done) {
            /* Find los of next pass or of current pass */
            los         = this.findLos(sat, qth, t0, maxdt); // See if a pass is ongoing
            aos         = this.findAos(sat, qth, t0, maxdt);

            if (aos > los) {
                // los is from an currently happening pass, find previous aos
                aos = this.findPrevAos(sat, qth, t0);
            }

            /* aos = 0.0 means no aos */
            if (aos === 0.0) {
                done = true;
            } else if ((maxdt > 0.0) && (aos > (start + maxdt)) ) {
                /* check whether we are within time limits;
                    maxdt = 0 mean no time limit.
                */
                done = true;
            } else {
                //los = findLos (sat, qth, aos + 0.001, maxdt); // +1.5 min later
                dt = los - aos;

                /* get time step, which will give us the max number of entries */
                step = dt / this.numEntries;

                /* but if this is smaller than the required resolution
                    we go with the resolution
                */
                if (step < tres) {
                    step = tres;
                }

                /* create a pass_t entry; FIXME: g_try_new in 2.8 */
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

                /* iterate over each time step */
                for (let t = pass.aos; t <= pass.los; t += step) {

                    /* calculate satellite data */
                    this.predictCalc(sat, qth, t);

                    /* in the first iter we want to store
                        pass.aos_az
                    */
                    if (t === pass.aos) {
                        pass.aos_az = sat.az;
                        pass.orbit  = sat.orbit;
                    }

                    /* append details to sat.details */
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

                    /* also store visibility "bit" */
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

                    // Using an array, no need to prepend and reverse the list
                    // as gpredict does
                    pass.details.push(detail);

                    // Look up apparent magnitude if this is a visible pass
                    if (detail.vis === this.SAT_VIS_VISIBLE) {
                        let apmag = sat.calculateApparentMagnitude(t, qth);
                        if (pass.max_apparent_magnitude === null || apmag < pass.max_apparent_magnitude) {
                            pass.max_apparent_magnitude = apmag;
                        }
                    }

                    /* store elevation if greater than the
                        previously stored one
                    */
                    if (sat.el > max_el) {
                        max_el          = sat.el;
                        tca             = t;
                        pass.maxel_az   = sat.az;
                    }

                    /*     g_print ("TIME: %f\tAZ: %f\tEL: %f (MAX: %f)\n", */
                    /*           t, sat.az, sat.el, max_el); */
                }

                /* calculate satellite data */
                this.predictCalc(sat, qth, pass.los);
                /* store los_az, max_el and tca */
                pass.los_az = sat.az;
                pass.max_el = max_el;
                pass.tca    = tca;

                /* check whether this pass is good */
                if (max_el >= this.minEle) {
                    done = true;
                } else {
                    done = false;
                    t0 = los + 0.014; // +20 min
                    pass = null;
                }

                iter++;
            }
        }

        return pass;
    }

    /**
     * Calculate satellite visibility.
     *
     *
     * @return int The visiblity constant, 0, 1, 2, or 3 (see above)
     */
    getSatVis = (sat, qth, jul_utc) =>
    {
        let eclipse_depth  = 0.0,
            zero_vector    = new Vector(),
            obs_geodetic   = new Geodetic(),

            /* Solar ECI position vector  */
            solar_vector    = new Vector(),

            /* Solar observed az and el vector  */
            solar_set       = new ObsSet();

        /* FIXME: could be passed as parameter */
        obs_geodetic.lon   = qth.lon * Constants.de2ra;
        obs_geodetic.lat   = qth.lat * Constants.de2ra;
        obs_geodetic.alt   = qth.alt / 1000.0;
        obs_geodetic.theta = 0;

        Solar.calculateSolarPosition(jul_utc, solar_vector);
        SGPObs.calculateObs(jul_utc, solar_vector, zero_vector, obs_geodetic, solar_set);

        let sat_sun_status, vis;
        sat_sun_status = !Solar.satEclipsed(sat.pos, solar_vector, eclipse_depth);

        if (sat_sun_status) {
            let sun_el = Maths.degrees(solar_set.el);

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

    /** Find the AOS time of the next pass.
     *  @author Alexandru Csete, OZ9AEC
     *  @author John A. Magliacane, KD2BD
     *  @return The julain date of the next AOS or 0.0 if the satellite has no AOS.
     *
     * This function finds the time of AOS for the first coming pass taking place
     * no earlier that start.
     * If the satellite is currently within range, the function first calls
     * findLos to get the next LOS time. Then the calculations are done using
     * the new start time.
     *
     */
    findAos = (sat, qth, start, maxdt) =>
    {
        let t       = start,
            aostime = 0.0;

        /* make sure current sat values are
            in sync with the time
        */
        this.predictCalc(sat, qth, start);

        /* check whether satellite has aos */
        if ((sat.otype === this.sgpsdp.ORBIT_TYPE_GEO) ||
            (sat.otype === this.sgpsdp.ORBIT_TYPE_DECAYED) ||
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

    predictCalc = (sat, qth, t) =>
    {
        let obs_set         = new ObsSet(),
            sat_geodetic    = new Geodetic(),
            obs_geodetic    = new Geodetic();

        obs_geodetic.lon    = qth.lon * Constants.de2ra;
        obs_geodetic.lat    = qth.lat * Constants.de2ra;
        obs_geodetic.alt    = qth.alt / 1000.0;
        obs_geodetic.theta  = 0;

        sat.jul_utc         = t;
        sat.tsince          = (sat.jul_utc - sat.jul_epoch) * Constants.xmnpda;

        /* call the norad routines according to the deep-space flag */
        if (sat.flags & this.sgpsdp.DEEP_SPACE_EPHEM_FLAG) {
            this.sgpsdp.SDP4(sat, sat.tsince);
        } else {
            this.sgpsdp.SGP4(sat, sat.tsince);
        }

        Maths.convertSatState(sat.pos, sat.vel);

        /* get the velocity of the satellite */
        sat.vel.w   = Math.sqrt(sat.vel.x * sat.vel.x + sat.vel.y * sat.vel.y + sat.vel.z * sat.vel.z);
        sat.velo    = sat.vel.w;

        SGPObs.calculateObs(sat.jul_utc, sat.pos, sat.vel, obs_geodetic, obs_set);
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

        /* same formulas, but the one from predict is nicer */
        //sat.footprint = 2.0 * xkmper * acos (xkmper/sat.pos.w);
        sat.footprint   = 12756.33 * Math.acos(Constants.xkmper / (Constants.xkmper + sat.alt));

        let age     = sat.jul_utc - sat.jul_epoch;

        sat.orbit   = Math.floor((sat.tle.xno * Constants.xmnpda / Constants.twopi +
            age * sat.tle.bstar * Constants.ae) * age +
            sat.tle.xmo / Constants.twopi) + sat.tle.revnum - 1;

    }

    findLos = (sat, qth, start, maxdt) =>
    {
        let t       = start,
            lostime = 0.0;

        this.predictCalc(sat, qth, start);

        /* check whether satellite has aos */
        if ((sat.otype === this.sgpsdp.ORBIT_TYPE_GEO) ||
            (sat.otype === this.sgpsdp.ORBIT_TYPE_DECAYED) ||
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
                t += Math.cos((sat.el - 1.0) * Constants.de2ra) * Math.sqrt(sat.alt) / 25000.0;
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
                t += Math.cos((sat.el - 1.0) * Constants.de2ra) * Math.sqrt(sat.alt) / 25000.0;
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

    findPrevAos = (sat, qth, start) =>
    {
        let aostime = start;

        /* make sure current sat values are
             in sync with the time
         */
        this.predictCalc(sat, qth, start);

        /* check whether satellite has aos */
        if ((sat.otype === this.sgpsdp.ORBIT_TYPE_GEO) ||
            (sat.otype === this.sgpsdp.ORBIT_TYPE_DECAYED) ||
            !this.hasAos(sat, qth)) {

            return 0.0;
        }

        while (sat.el >= 0.0) {
            aostime -= 0.0005; // 0.75 min
            this.predictCalc(sat, qth, aostime);
        }

        return aostime;
    }

    hasAos = (sat, qth) =>
    {
        let retcode;

        if (sat.meanmo === 0.0) {
            retcode = false;
        } else {
            let lin = sat.tle.xincl;

            if (lin >= Constants.pio2) {
                lin = Constants.pi - lin;
            }

            let sma = 331.25 * Math.exp(Math.log(1440.0 / sat.meanmo) * (2.0 / 3.0)),
                apogee = sma * (1.0 + sat.tle.eo) - Constants.xkmper;


            retcode = (Math.acos(Constants.xkmper / (apogee + Constants.xkmper)) + (lin)) > Math.abs(qth.lat * Constants.de2ra);
        }

        return retcode;
    }

    getPasses = (sat, qth, start, maxdt, num) =>
    {
        let passes = [], i, t, pass;

        /* if no number has been specified
            set it to something big */
        if (num === 0) {
            num = 100;
        }

        t = start;

        for (i = 0; i < 10; i++) {
            pass = this.getPass(sat, qth, t, maxdt);

            if (pass != null) {
                passes.push(pass);

                t = pass.los + 0.014; // +20 min

                /* if maxdt > 0.0 check whether we have reached t = start + maxdt
                    if yes finish predictions
                */
                if ((maxdt > 0.0) && (t >= (start + maxdt))) {
                    i = num;
                }
            } else {
                /* we can't get any more passes */
                i = num;
            }
        }

        return passes;
    }

    filterVisiblePasses = (passes) =>
    {
        let filtered = [], aos, aos_az, tca, los_az, max_el,
            aos_el, los, los_el, max_el_az;

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

    azDegreesToDirection = (az = 0) =>
    {
        let i = Math.floor(az / 22.5),
            m = (22.5 * (2 * i + 1)) / 2;

        i = (az >= m) ? i + 1 : i;

        //return trim(substr('N  NNENE ENEE  ESESE SSES  SSWSW WSWW  WNWNW NNWN  ', i * 3, 3));
        return "test string";
    }
}

module.exports = Predict;
