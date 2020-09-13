/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const got = require('got');
const querystring = require('querystring');
const Eta = require('./scripts/Eta.js')

/* ETAFetcher

 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * attribute url string - URL of the news feed.
 * attribute reloadInterval number - Reload interval in milliseconds.
 */

var ETAFetcher = function (stop, reloadInterval) {
  var self = this;
  reloadInterval = (reloadInterval < 1000) ? 1000 : reloadInterval;

  var reloadTimer = null;
  var items = [];

  var fetchFailedCallback = function () { };
  var itemsReceivedCallback = function () { };

  let url;

  /* private methods */

	/* fetchETA()
	 * Request the ETA.
	 */
  var fetchETA = function () {
    clearTimeout(reloadTimer);
    reloadTimer = null;

    Eta.get(
      stop
      , function (/** Array */ etas) {
        items = etas;
        self.broadcastItems();
        scheduleTimer();
      }
    );
  };

	/* scheduleTimer()
	 * Schedule the timer for the next update.
	 */
  var scheduleTimer = function () {
    //console.log('Schedule update timer.');
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function () {
      fetchETA();
    }, reloadInterval);
  };

  /* public methods */

	/* setReloadInterval()
	 * Update the reload interval, but only if we need to increase the speed.
	 *
	 * attribute interval number - Interval for the update in milliseconds.
	 */
  this.setReloadInterval = function (interval) {
    if (interval > 1000 && interval < reloadInterval) {
      reloadInterval = interval;
    }
  };

	/* startFetch()
	 * Initiate fetchETA();
	 */
  this.startFetch = function () {
    fetchETA();
  };

	/* broadcastItems()
	 * Broadcast the existing items.
	 */
  this.broadcastItems = function () {
    if (items.length <= 0) {
      //console.log('No items to broadcast yet.');
      return;
    }
    //console.log('Broadcasting ' + items.length + ' items.');
    itemsReceivedCallback(self);
  };

  this.onReceive = function (callback) {
    itemsReceivedCallback = callback;
  };

  this.onError = function (callback) {
    fetchFailedCallback = callback;
  };

  this.url = function () {
    return url;
  };

  this.route = function () {
    return stopInfo.Route;
  }

  this.items = function () {
    return items;
  };
};

module.exports = ETAFetcher;
