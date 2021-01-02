const Constants = require('./Constants');

/**
 * Add vectors v1 and v2 to product v3
 * @param {PredictVector} v1
 * @param {PredictVector} v2
 * @param {PredictVector} v3
 */
vecAdd = (v1, v2, v3) => {
    v3.x = v1.x + v2.x;
    v3.y = v1.y + v2.y;
    v3.z = v1.z + v2.z;

    v3.w = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
},

/**
 * Subtract vectors v2 from v1 to product vector v3
 * @param {PredictVector} v1
 * @param {PredictVector} v2
 * @param {PredictVector} v3
 */
vecSub = (v1, v2, v3) => {
    v3.x = v1.x - v2.x;
    v3.y = v1.y - v2.y;
    v3.z = v1.z - v2.z;

    v3.w = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
},

/**
 * Multiply vector v1 by scalar k to product vector v2
 * @param {number} k
 * @param {PredictVector} v1
 * @param {PredictVector} v2
 */
scalarMultiply = (k, v1, v2) => {
    v2.x = k * v1.x;
    v2.y = k * v1.y;
    v2.z = k * v1.z;

    v2.w = Math.abs(k) * v1.w;
},

/**
 * Multiply vector v1 by scalar k
 * @param {number} k
 * @param {PredictVector} v
 */
scaleVector = (k, v) => {
    v.x *= k;
    v.y *= k;
    v.z *= k;

    v.w = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
},

/**
 * Get dot product of vectors v1 and v2
 * @param {PredictVector} v1
 * @param {PredictVector} v2
 * @return {number}
 */
dot = (v1, v2) => {
    return (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z);
},

/**
 * Get angle between vectors v1 and v2
 * @param {PredictVector} v1
 * @param {PredictVector} v2
 * @return {number}
 */
angle = (v1, v2) => {
    v1.w = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    v2.w = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

    return (Math.acos(dot(v1, v2) / (v1.w * v2.w)));
},

/**
 * Get cross product of vectors v1 and v2 to product vector v3
 * @param {PredictVector} v1
 * @param {PredictVector} v2
 * @param {PredictVector} v3
 */
cross = (v1, v2, v3) => {
    v3.x = v1.y * v2.z - v1.z * v2.y;
    v3.y = v1.z * v2.x - v1.x * v2.z;
    v3.z = v1.x * v2.y - v1.y * v2.x;

    v3.w = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
},

/**
 * Normalize vector v
 * @param {PredictVector} v
 */
normalize = (v) => {
    v.x /= v.w;
    v.y /= v.w;
    v.z /= v.w;
},

/**
 * Four-quadrant arctan function
 * @param {number} sinx
 * @param {number} cosx
 * @return {number}
 */
acTan = (sinx, cosx) => {
    if (cosx === 0) {
        if (sinx > 0) {
            return Constants.pio2;
        } else {
            return Constants.x3pio2;
        }
    } else {
        if (cosx > 0) {
            if (sinx > 0) {
                return Math.atan(sinx / cosx);
            } else {
                return Constants.twopi + Math.atan(sinx / cosx);
            }
        } else {
            return Constants.pi + Math.atan(sinx / cosx);
        }
    }
},

/**
 * Modulo 2pi of argument
 * @param {number} arg
 * @return {number}
 */
fMod2p = (arg) => {
    let ret_val;
    ret_val  = arg;

    const i  = Math.floor((ret_val / Constants.twopi));
    ret_val -= i * Constants.twopi;

    if (ret_val < 0) {
        ret_val += Constants.twopi;
    }

    return ret_val;
},

/**
 * arg1 mod arg2
 * @param {number} arg1
 * @param {number} arg2
 * @return {number}
 */
modulus = (arg1, arg2) => {
    return (arg1 % arg2);
},

/**
 * Fractional part of argument
 * @param {number} arg
 * @return {number}
 */
frac = (arg) => {
    return (arg - Math.floor(arg));
},

/**
 * Convert satellite's position and velocity vectors from
 * normalised values to km and km/sec
 * @param {PredictVector} pos
 * @param {PredictVector} vel
 */
convertSatState = (pos, vel) => {
    scaleVector(Constants.xkmper, pos);
    scaleVector(Constants.xkmper * Constants.xmnpda / Constants.secday, vel);
},

/**
 * Angle in radians from arg in degrees
 * @param {number} arg
 * @return {number}
 */
radians = (arg) => {
    return arg * Constants.de2ra;
},

/**
 * Angle in degrees from arg in rads
 * @param {number} arg
 * @return {number}
 */
degrees = (arg) => {
    return arg / Constants.de2ra;
};

module.exports = {
    vecAdd,
    vecSub,
    scalarMultiply,
    scaleVector,
    dot,
    angle,
    cross,
    normalize,
    acTan,
    fMod2p,
    modulus,
    frac,
    convertSatState,
    radians,
    degrees,
};
