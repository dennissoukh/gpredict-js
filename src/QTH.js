class PredictQTH
{
    name;   /* Name, eg. callsign. */
    loc;    /* Location, eg City, Country. */
    desc;   /* Short description. */
    lat;    /* Latitude in dec. deg. North. */
    lon;    /* Longitude in dec. deg. East. */
    alt;    /* Altitude above sea level in meters. */
    qra;    /* QRA locator */
    wx;     /* Weather station code (4 chars). */

    data;   /* Raw data from cfg file. */
}

module.exports = PredictQTH
