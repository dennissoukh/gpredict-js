/**
 * Bearing to satellite from observer.
 */
class PredictObsSet {
    az          = 0.0; /* Azimuth [deg] */
    el          = 0.0; /* Elevation [deg] */
    range       = 0.0; /* Range [km] */
    range_rate  = 0.0; /* Velocity [km/sec] */
}

module.exports = PredictObsSet;
