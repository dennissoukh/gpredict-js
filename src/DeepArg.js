/**
 * Common arguments between deep-space functions.
 * This is a port of deep_arg_t struct from sgp4sdp4.h.
 */
class DeepArg {
    /* Used by dpinit part of Deep() */
    eosq;
    sinio;
    cosio;
    betao;
    aodp;
    theta2;
    sing;
    cosg;
    betao2;
    xmdot;
    omgdot;
    xnodot;
    xnodp;

    /* Used by dpsec and dpper parts of Deep() */
    xll;
    omgadf;
    xnode;
    em;
    xinc;
    xn;
    t;

    /* Used by thetg and Deep() */
    ds50;
}

module.exports = DeepArg;
