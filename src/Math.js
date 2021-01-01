const Constants = require('./Constants');

class PredictMath
{
    /* Returns sign of a float */
    Sign = (arg) => {
        return arg ? arg < 0 ? -1 : 1 : 0;
    }

    /* Returns the arcsine of the argument */
    ArcSin = (arg) => {
        return Math.asin(arg);
    }

    /* Returns arccosine of argument */
    ArcCos = (arg) => {
        return Math.acos(arg);
    }

    /* Adds vectors v1 and v2 together to produce v3 */
    VecAdd = (v1, v2, v3) => {
        v3.x = v1.x + v2.x;
        v3.y = v1.y + v2.y;
        v3.z = v1.z + v2.z;

        v3.w = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
    }

    /* Subtracts vector v2 from v1 to produce v3 */
    VecSub = (v1, v2, v3) => {
        v3.x = v1.x - v2.x;
        v3.y = v1.y - v2.y;
        v3.z = v1.z - v2.z;

        v3.w = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z)
    }

    /* Multiplies the vector v1 by the scalar k to produce the vector v2 */
    ScalarMultiply = (k, v1, v2) => {
        v2.x = k * v1.x;
        v2.y = k * v1.y;
        v2.z = k * v1.z;

        v2.w = Math.abs(k) * v1.w;
    }

    /* Multiplies the vector v1 by the scalar k */
    ScaleVector = (k, v) => {
        v.x *= k;
        v.y *= k;
        v.z *= k;

        v.w = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    /* Returns the dot product of two vectors */
    Dot = (v1, v2) => {
        return (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z);
    }

    /* Calculates the angle between vectors v1 and v2 */
    Angle = (v1, v2) => {
        v1.w = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        v2.w = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

        return (this.ArcCos(this.Dot(v1, v2) / (v1.w * v2.w)));
    }

    /* Produces cross product of v1 and v2, and returns in v3 */
    Cross = (v1, v2, v3) => {
        v3.x = v1.y * v2.z - v1.z * v2.y;
        v3.y = v1.z * v2.x - v1.x * v2.z;
        v3.z = v1.x * v2.y - v1.y * v2.x;

        v3.w = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z)
    }

    /* Normalizes a vector */
    Normalize = (v) => {
        v.x /= v.w;
        v.y /= v.w;
        v.z /= v.w;
    }

    /* Four-quadrant arctan function */
    AcTan = (sinx, cosx) => {
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
    }

    /* Returns mod 2pi of argument */
    FMod2p = (x) => {
        let i, ret_val;

        ret_val  = x;
        i        = Math.floor((ret_val / Constants.twopi));
        ret_val -= i * Constants.twopi;

        if (ret_val < 0) {
            ret_val += Constants.twopi;
        }

        return ret_val;
    }

    /* Returns arg1 mod arg2 */
    Modulus = (arg1, arg2) => {
        return (arg1 % arg2);
    }

    /* Returns fractional part of double argument */
    Frac = (arg) => {
        return (arg - Math.floor(arg));
    }

    /* Converts the satellite's position and velocity  */
    /* vectors from normalised values to km and km/sec */
    ConvertSatState = (pos, vel) => {
        this.ScaleVector(Constants.xkmper, pos);
        this.ScaleVector(Constants.xkmper * Constants.xmnpda / Constants.secday, vel);
    }

    /* Returns angle in radians from arg in degrees */
    Radians = (arg) => {
        return arg * Constants.de2ra;
    }

    /* Returns angle in degrees from arg in rads */
    Degrees = (arg) => {
        return arg / Constants.de2ra;
    }

    Fmod = (a, b) => {
        return Number((a - (Math.floor(a / b) * b)).toPrecision(8));
    }

    /* Returns fractional part of double argument */
    Frac = (arg) => {
        return (arg - Math.floor(arg));
    }
}

module.exports = new PredictMath;