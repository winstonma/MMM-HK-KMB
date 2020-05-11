/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const got = require('got');
const querystring = require('querystring');

const routeStopCheckUrl = "http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?";

var BusStopsFetcher = function (route, stopID) {
  var self = this;

  let items = [];

  var fetchFailedCallback = function () { };
  var itemsReceivedCallback = function () { };

  const parseQueryString = {
    action: "getallstops"
  };
  const url = routeStopCheckUrl + querystring.stringify(parseQueryString);

  /* private methods */

  /* fetchBusStops()
   * To get the info of all bus stops
   * Example: http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?action=getroutebound&route=1
   * 
   */
  fetchBusStops = async function () {
    items = [];
    try {
      const { body } = await got.post(url, {
        responseType: 'json'
      });
      items = body.data.stops;
      self.broadcastItems();
    } catch (error) {
      console.log("Error obtaining BusRoute connections: " + error.response.body);
      fetchFailedCallback(self, error);
    }
  };

  /* public methods */

  /* startFetch()
   * Initiate fetchBusRoute();
   */
  this.startFetch = function () {
    fetchBusStops();
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

module.exports = BusStopsFetcher;