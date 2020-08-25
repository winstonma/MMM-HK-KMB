/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const schedule = require('node-schedule');
const StopRoute = require('./scripts/StopRoute.js');
const Stop = require('./scripts/Stop.js');

var BusStopFetcher = function (stopID) {
  var self = this;

  var item = null;

  // Create a schdule to fetch
  var rule = new schedule.RecurrenceRule();
  rule.hour = 5;  // 5am
  rule.minute = 0;
  rule.second = 0;
  var j = schedule.scheduleJob(rule, function () {
    console.log('Fetching bus stop');
    fetchBusStop();
  });

  var fetchFailedCallback = function () { };
  var itemsReceivedCallback = function () { };

  /* private methods */

  /* fetchBusStop()
   * Find out what route passes this bus stop
   */

  const update_common_route_list = function (/** Object<string, Array<StopRoute>> */ result) {
    item = result;
    console.log("update_common_route_list");
    self.broadcastItems();
  }

  /**
   *
   * @param {int} count
   */
  const update_route_progress = function (count) {
    // This API can print out the update count, but it is ignored here
  }

  const fetchBusStop = function () {
    const stop = stopID !== null ? new Stop(stopID, null, null) : null;
    StopRoute.get(stop,
      update_common_route_list,
      update_route_progress);
  };

  /* public methods */

  /* startFetch()
   * Initiate fetchBusStop();
   */
  this.startFetch = function () {
    fetchBusStop();
  };

  /* broadcastItems()
   * Broadcast the existing items.
   */
  this.broadcastItems = function () {
    if (item == null) {
      return;
    }
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