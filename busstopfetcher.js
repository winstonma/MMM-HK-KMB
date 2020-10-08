/* Magic Mirror
 * Node Helper: MMM-HK-KMB - BusStopFetcher
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

const Log = require("../../js/logger.js");
const schedule = require('node-schedule');
const StopRoute = require('./scripts/StopRoute.js');
const Stop = require('./scripts/Stop.js');

/**
 * Responsible for requesting an update and broadcasting the data.
 *
 * @param {string} stopID stop ID of the stop
 * @class
 */
const BusStopFetcher = function (stopID) {
  const self = this;

  let item = null;

  // Create a schduler to update the bustop info (every 5am)
  let schduler = schedule.scheduleJob('* 5 * * *', () => {
    Log.log(`BusStop-Fetcher: Fetching stop info for stop ID: ${stopID}`);
    fetchBusStop();
  });

  let fetchFailedCallback = function () { };
  let itemsReceivedCallback = function () { };

  /* private methods */

  const update_common_route_list = function (/** Object<string, Array<StopRoute>> */ result) {
    item = result;
    self.broadcastItems();
  }

  /**
   *
   * @param {int} count
   */
  const update_route_progress = function (count) {
    // This API can print out the update count, but it is ignored here
  }

  /**
   * Request the stop info
   */
  const fetchBusStop = function () {
    const stop = stopID ? new Stop(stopID, null, null) : null;
    StopRoute.get(stop,
      update_common_route_list,
      update_route_progress);
  };

  /* public methods */

	/**
	 * Initiate fetchBusStop();
	 */
  this.startFetch = function () {
    fetchBusStop();
  };

	/**
	 * Broadcast the existing item.
	 */
  this.broadcastItems = function () {
    if (item == null) {
      Log.info("BusStop-Fetcher: No item to broadcast yet.");
      return;
    }
    Log.info(`BusStop-Fetcher: Broadcasting item for stop ID ${stopID}`);
    itemsReceivedCallback(self);
  };

  this.onReceive = function (callback) {
    itemsReceivedCallback = callback;
  };

  this.onError = function (callback) {
    fetchFailedCallback = callback;
  };

  this.stopID = function () {
    return stopID;
  };

  this.item = function () {
    return item;
  };
};

module.exports = BusStopFetcher;