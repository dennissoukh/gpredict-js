const Vector = require('./Vector');

class PredictPassDetail
{
    time;   /* time in "jul_utc" */
    pos;    /* Raw unprocessed position at time */
    vel;    /* Raw unprocessed velocity at time */
    velo;
    az;
    el;
    range;
    range_rate;
    lat;
    lon;
    alt;
    ma;
    phase;
    footprint;
    vis;
    orbit;

    constructor()
    {
        this.pos = new Vector();
        this.vel = new Vector();
    }
}

module.exports = PredictPassDetail
