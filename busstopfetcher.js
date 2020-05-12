/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const got = require('got');
const querystring = require('querystring');
const schedule = require('node-schedule');

var baseUrl = "http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?";

var BusStopFetcher = function (stopID) {
  var self = this;

  var items = [];

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

  const fetchBusStop = function () {
    const parseQueryString = {
      action: "getRoutesInStop",
      bsiCode: stopID
    };
    const url = baseUrl + querystring.stringify(parseQueryString);
    reloadTimer = null;
    items = [];

    (async () => {
      try {
        const { body } = await got.post(url, {
          responseType: 'json'
        });
        body.url = url;
        items.push(body);
        self.broadcastItems();
      } catch (error) {
        console.log(error.response.body);
        fetchFailedCallback(self, error);
      }
    })();
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

  this.stopID = function () {
    return stopID;
  };

  this.items = function () {
    return items;
  };
};

module.exports = BusStopFetcher;