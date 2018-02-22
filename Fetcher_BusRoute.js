/* Magic Mirror
 * Fetcher
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var request = require("request");
var querystring = require('querystring');

var routeBoundCheckUrl = "http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?";

/* Fetcher
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * attribute url string - URL of the news feed.
 * attribute reloadInterval number - Reload interval in milliseconds.
 */

var Fetcher_BusStop = function(route, stopID) {
	var self = this;

	var items = [];

	var fetchFailedCallback = function() {};
	var itemsReceivedCallback = function() {};

	/* private methods */

	/* fetchBusRoute()
	 * To find out how many different bound and service type does it contain
     * Example: http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?action=getroutebound&route=1
     * 
	 */
	var fetchBusRoute = function() {
		items = [];

		var parseQueryString = {
			action:'getroutebound',
			route:route.trim()
		};
		url = routeBoundCheckUrl + querystring.stringify(parseQueryString);

		request.post(url, (error, response, body) => {
			if (error) {
				console.log("Error obtaining BusRoute connections: " + error);
				fetchFailedCallback(self, error);
			}
			responseObj = JSON.parse(body);
			if (!responseObj || !responseObj.result) {
				console.log("BusRoute response error: " + response.statusCode);
				fetchFailedCallback(self, error);
			}
			for (f in responseObj.data) {
				routeObj = responseObj.data[f];
				fetchBusRouteInfo(routeObj);
			}
        });

	};

	/* fetchBusRouteInfo()
	 * To obtain the list of bus stops
     * Example: http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?action=getstops&route=1&bound=1&serviceType=1
	 */
	var fetchBusRouteInfo = function(routeObj) {
		// Assumption: Only the main service type is served
		if (routeObj.SERVICE_TYPE != 1) {
			return;
		}
		items = [];

		var parseQueryString = {
			action:'getstops',
			route:routeObj.ROUTE,
			bound:routeObj.BOUND,
			serviceType:routeObj.SERVICE_TYPE
		};
		url = routeBoundCheckUrl + querystring.stringify(parseQueryString);

		request.post(url, (error, response, body) => {
			if (error) {
				console.log("Error getting BusRoute connections: " + error);
				fetchFailedCallback(self, error);
                scheduleTimer();
			} else {
                responseObj = JSON.parse(body);
                if (!responseObj || !responseObj.result) {
                    console.log("Error obtaining BusRoute connections " + response.statusCode);
                    fetchFailedCallback(self, error);
                    scheduleTimer();
                } else {
                    // Return all the values, the filtering process will be done on the upper level
                    items.push(responseObj.data);
                    self.broadcastItems();
                }
            }
        });
	};
    
    /* scheduleTimer()
	 * Schedule the timer for the next update.
	 */

	var scheduleTimer = function() {
		//console.log('Schedule update timer.');
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function() {
			fetchBusRouteInfo();
		}, reloadInterval);
    };

	/* public methods */

	/* startFetch()
	 * Initiate fetchBusRoute();
	 */
	this.startFetch = function() {
		fetchBusRoute();
	};

	/* broadcastItems()
	 * Broadcast the existing items.
	 */
	this.broadcastItems = function() {
		if (items.length <= 0) {
			//console.log('No items to broadcast yet.');
			return;
		}
		//console.log('Broadcasting ' + items.length + ' items.');
		itemsReceivedCallback(self);
	};

	this.onReceive = function(callback) {
		itemsReceivedCallback = callback;
	};

	this.onError = function(callback) {
		fetchFailedCallback = callback;
	};

	this.url = function() {
		return url;
	};

	this.items = function() {
		return items;
	};
};

module.exports = Fetcher_BusStop;