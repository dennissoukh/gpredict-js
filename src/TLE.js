/**
 * Process the satellite's TLE
 */
class PredictTLE {
    header;
    line1;
    line2;
    epoch;      /* Epoch Time in NORAD TLE format YYDDD.FFFFFFFF */
    epoch_year; /* Epoch: year */
    epoch_day;  /* Epoch: day of year */
    epoch_fod;  /* Epoch: Fraction of day. */
    xndt2o;     /* 1. time derivative of mean motion */
    xndd6o;     /* 2. time derivative of mean motion */
    bstar;      /* Bstar drag coefficient. */
    xincl;      /* Inclination */
    xnodeo;     /* R.A.A.N. */
    eo;         /* Eccentricity */
    omegao;     /* argument of perigee */
    xmo;        /* mean anomaly */
    xno;        /* mean motion */

    catnr;      /* Catalogue Number.  */
    elset;      /* Element Set number. */
    revnum;     /* Revolution Number at epoch. */

    sat_name;   /* Satellite name string. */
    idesg;      /* International Designator. */
    status;     /* Operational status. */

    /* values needed for squint calculations */
    xincl1;
    xnodeo1;
    omegao1;

    /**
     * Constructor for class TLE.
     * @param {string} header
     * @param {string} line1
     * @param {string} line2
     */
    constructor(header, line1, line2) {
        this.header = header;     /* Header line of TLE file */
        this.line1  = line1;      /* Line 1 of TLE */
        this.line2  = line2;      /* Line 2 of TLE */

        if (! this.checkElements(line1, line2)) {
            throw new Error('The TLE format is incorrect!');
        }

        /* Satellite's catalogue number */
        this.catnr = Number(this.line1.substr(2, 5));

        /* International Designator for satellite */
        this.idesg = this.line1.substr(9, 8).trim();

        /* Epoch time; this is the complete, unconverted epoch */
        /* Replace spaces with 0 before casting */
        this.epoch = Number(this.line1.substr(18, 14).replace(' ', '0'));

        /* Now, convert the epoch time into year, day
           and fraction of day, according to:
           YYDDD.FFFFFFFF
        */

        // Adjust for 2 digit year through 2056
        this.epoch_year = Number(this.line1.substr(18, 2));
        if (this.epoch_year > 56) {
            this.epoch_year = this.epoch_year + 1900;
        } else {
            this.epoch_year = this.epoch_year + 2000;
        }

        /* Epoch day */
        this.epoch_day = Number(line1.substr(20, 3));

        /* Epoch fraction of day */
        this.epoch_fod = Number(line1.substr(23, 9));

        /* Satellite's First Time Derivative */
        this.xndt2o = Number(line1.substr(33, 10));

        /* Satellite's Second Time Derivative */
        this.xndd6o = Number(line1.substr(44, 1) + '.' +
            line1.substr(45, 5) + 'E' +
            line1.substr(50, 2),
        );

        /* Satellite's bstar drag term */
        this.bstar = Number(line1.substr(53, 1) + '.' +
            line1.substr(54, 5) + 'E' +
            line1.substr(59, 2),
        );

        /* Element Number */
        this.elset = Number(line1.substr(64, 4));

        /* Satellite's Orbital Inclination (degrees) */
        this.xincl = Number(line2.substr(8, 8));

        /* Satellite's RAAN (degrees) */
        this.xnodeo = Number(line2.substr(17, 8));

        /* Satellite's Orbital Eccentricity */
        this.eo = Number('.' + line2.substr(26, 7));

        /* Satellite's Argument of Perigee (degrees) */
        this.omegao = Number(line2.substr(34, 8));

        /* Satellite's Mean Anomaly of Orbit (degrees) */
        this.xmo = Number(line2.substr(43, 8));

        /* Satellite's Mean Motion (rev/day) */
        this.xno = Number(line2.substr(52, 11));

        /* Satellite's Revolution number at epoch */
        this.revnum = Number(line2.substr(63, 5));

        /* Satellite's Name */
        this.sat_name = this.header;
    }

    /**
     * Calculates the checksum mod 10 of a line from a TLE set and
     * returns true if it compares with checksum in column 68, else false.
     * tleSet is a character string holding the two lined element set.
     *
     * @param {string} tleSet
     * @return {boolean}
     */
    checkChecksum = (tleSet) => {
        if (tleSet.length < 69) {
            return false;
        }

        let checksum = 0;
        let value;

        for (let i = 0; i < 68; i++) {
            if ((tleSet.charAt(i) >= '0') && (tleSet.charAt(i) <= '9')) {
                value = tleSet.charAt(i) - '0';
            } else if (tleSet.charAt(i) === '-') {
                value = 1;
            } else {
                value = 0;
            }

            checksum += value;
        }

        checksum %= 10;
        const check_digit = tleSet.charAt(68) - '0';

        return checksum === check_digit;
    }


    /**
     * Converts the strings in a raw two-line element set to
     * their intended numerical values. No processing of these
     * values is done, e.g. from deg to rads etc. This is done
     * in the select_ephemeris() function.
     *
     * @param {string} line1
     * @param {string} line2
     * @return {boolean}
     */
    checkElements = (line1, line2) => {
        if (!this.checkChecksum(line1) || !this.checkChecksum(line2)) {
            return false;
        }

        if ((line1.charAt(0) !== '1') || (line2.charAt(0) !== '2')) {
            return false;
        }

        if (line1.substr(2, 5) !== line2.substr(2, 5)) {
            return false;
        }

        if ((line1.charAt(23) !== '.') ||
            (line1.charAt(34) !== '.') ||
            (line2.charAt(11) !== '.') ||
            (line2.charAt(20) !== '.') ||
            (line2.charAt(37) !== '.') ||
            (line2.charAt(46) !== '.') ||
            (line2.charAt(54) !== '.') ||
            (line1.substr(61, 3) !== ' 0 ')
        ) {
            return false;
        }

        return true;
    }

    /**
     * A function to allow checksum creation of a line.  This is driven by
     * the fact that some TLEs from SpaceTrack are missing checksum numbers.
     * You can use this to create a checksum for a line, but you should
     * probably have confidence that the TLE data itself is good.
     *
     * @param {string} line
     * @return {number}
     */
    createChecksum = (line) => {
        if (line.length !== 68) {
            throw new Error('Invalid line, needs to be 68 chars');
        }

        let checksum = 0;
        let value;

        for (let i = 0; i < 68; i++) {
            if ((line.charAt(i) >= '0') && (line.charAt(i) <= '9')) {
                value = Number(line.charAt(i));
            } else if (line.charAt(i) === '-') {
                value = 1;
            } else {
                value = 0;
            }

            checksum += value;
        }

        checksum %= 10;

        return checksum;
    }
}

module.exports = PredictTLE;
