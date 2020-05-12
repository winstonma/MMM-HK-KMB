/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const got = require('got');

const routeBoundCheckUrl = "http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?";

var BusRouteFetcher = function (route, stopID) {
  var self = this;

  var items = [];

  var fetchFailedCallback = function () { };
  var itemsReceivedCallback = function () { };

  /* private methods */

  /* fetchBusRoute()
   * To find out how many different bound and service type does it contain
   * Example: http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?action=getroutebound&route=1
   * 
   */
  var fetchBusRoute = function () {
    items = [];

    const parseQueryString = {
      action: 'getroutebound',
      route: route.trim()
    };

    (async () => {
      try {
        const { body } = await got.post(routeBoundCheckUrl, {
          searchParams: parseQueryString,
          responseType: 'json'
        });
        for (f in body.data) {
          routeObj = body.data[f];
          fetchBusRouteInfo(routeObj);
        }
      } catch (error) {
        console.log(error.response.body);
        fetchFailedCallback(self, error);
      }
    })();
  };

  /* fetchBusRouteInfo()
   * To obtain the list of bus stops
   * Example: http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?action=getstops&route=1&bound=1&serviceType=1
   */
  var fetchBusRouteInfo = function (routeObj) {
    // Assumption: Only the main service type is served
    if (routeObj.SERVICE_TYPE != 1) {
      return;
    }
    items = [];

    const parseQueryString = {
      action: 'getstops',
      route: routeObj.ROUTE,
      bound: routeObj.BOUND,
      serviceType: routeObj.SERVICE_TYPE
    };

    (async () => {
      try {
        const { body } = await got.post(routeBoundCheckUrl, {
          searchParams: parseQueryString,
          responseType: 'json'
        });
        items.push(body.data);
        self.broadcastItems();
      } catch (error) {
        console.log(error.response.body);
        fetchFailedCallback(self, error);
      }
    })();
  };

  /* scheduleTimer()
   * Schedule the timer for the next update.
   */

  var scheduleTimer = function () {
    //console.log('Schedule update timer.');
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function () {
      fetchBusRouteInfo();
    }, reloadInterval);
  };

  /* public methods */

  /* startFetch()
   * Initiate fetchBusRoute();
   */
  this.startFetch = function () {
    fetchBusRoute();
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

  this.items = function () {
    return items;
  };
};

module.exports = BusRouteFetcher;