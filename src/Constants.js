const Constants =
{
    de2ra    :  1.74532925e-2,   /* Degrees to Radians */
    pi       :  3.1415926535898, /* Pi */
    pio2     :  1.5707963267949, /* Pi/2 */
    x3pio2   :  4.71238898,      /* 3*Pi/2 */
    twopi    :  6.2831853071796, /* 2*Pi  */
    e6a      :  1.0e-6,
    tothrd   :  6.6666667e-1,    /* 2/3 */
    xj2      :  1.0826158e-3,    /* J2 Harmonic */
    xj3      : -2.53881e-6,      /* J3 Harmonic */
    xj4      : -1.65597e-6,      /* J4 Harmonic */
    xke      :  7.43669161e-2,
    xkmper   :  6.378135e3,      /* Earth radius km */
    xmnpda   :  1.44e3,          /* Minutes per day */
    km2mi    :  0.621371,        /* Kilometers per Mile */
    ae       :  1.0,
    ck2      :  5.413079e-4,
    ck4      :  6.209887e-7,
    __f      :  3.352779e-3,
    ge       :  3.986008e5,
    __s__    :  1.012229,
    qoms2t   :  1.880279e-09,
    secday   :  8.6400e4,        /* Seconds per day */
    omega_E  :  1.0027379,
    omega_ER :  6.3003879,
    zns      :  1.19459e-5,
    c1ss     :  2.9864797e-6,
    zes      :  1.675e-2,
    znl      :  1.5835218e-4,
    c1l      :  4.7968065e-7,
    zel      :  5.490e-2,
    zcosis   :  9.1744867e-1,
    zsinis   :  3.9785416e-1,
    zsings   : -9.8088458e-1,
    zcosgs   :  1.945905e-1,
    zcoshs   :  1,
    zsinhs   :  0,
    q22      :  1.7891679e-6,
    q31      :  2.1460748e-6,
    q33      :  2.2123015e-7,
    g22      :  5.7686396,
    g32      :  9.5240898e-1,
    g44      :  1.8014998,
    g52      :  1.0508330,
    g54      :  4.4108898,
    root22   :  1.7891679e-6,
    root32   :  3.7393792e-7,
    root44   :  7.3636953e-9,
    root52   :  1.1428639e-7,
    root54   :  2.1765803e-9,
    thdt     :  4.3752691e-3,
    rho      :  1.5696615e-1,
    mfactor  :  7.292115e-5,
    __sr__   :  6.96000e5,      /* Solar radius - kilometers (IAU 76) */
    AU       :  1.49597870e8,   /* Astronomical unit - kilometers (IAU 76) */
};

module.exports = Object.freeze(Constants);
