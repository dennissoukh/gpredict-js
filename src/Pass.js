class PredictPass
{
    satname;                        /* satellite name */
    aos;                            /* AOS time in "jul_utc" */
    tca;                            /* TCA time in "jul_utc" */
    los;                            /* LOS time in "jul_utc" */
    max_el;                         /* Maximum elevation during pass */
    aos_az;                         /* Azimuth at AOS */
    los_az;                         /* Azimuth at LOS */
    orbit;                          /* Orbit number */
    maxel_az;                       /* Azimuth at maximum elevation */
    vis;                            /* Visibility string, e.g. VSE, -S-, V-- */
    details = new Array();          /* List of pass_detail_t entries */
    max_apparent_magnitude = null;  /* Maximum apparent magnitude, experimental */
}

module.exports = PredictPass