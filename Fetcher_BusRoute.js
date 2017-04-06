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
	 * To find out how many different bound and service type does it owns
	 */
	var fetchBusRoute = function() {
		items = [];

		var parseQueryString = {
			action:'getroutebound',
			route:route.trim()
		};
		url = routeBoundCheckUrl + querystring.stringify(parseQueryString);

		request(url, (error, response, body) => {
			if (response.statusCode === 200) {
				responseObj = JSON.parse(body);
				if (!responseObj || !responseObj.result) {
					console.log("Error obtaining BusRoute connections " + response.statusCode);
					fetchFailedCallback(self, error);
				}
				for (f in responseObj.data) {
					routeObj = responseObj.data[f];
					fetchBusRouteInfo(routeObj);
				}
            } else {
                console.log("Error getting BusRoute connections " + response.statusCode);
                fetchFailedCallback(self, error);
            }
        });

	};

	/* fetchBusRouteInfo()
	 * To find out how many stops
	 */
	var fetchBusRouteInfo = function(routeObj) {
		// This assumption may not be valid
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

		request(url, (error, response, body) => {
			if (response.statusCode === 200) {
				responseObj = JSON.parse(body);
				if (!responseObj || !responseObj.result) {
					console.log("Error obtaining BusRoute connections " + response.statusCode);
					fetchFailedCallback(self, error);
				}
				var match = responseObj.data.routeStops.find(function findStop(stops) {
					return (stops.BSICode.split("-")[0] === stopID.split("-")[0] &&
						stops.BSICode.split("-")[1] === stopID.split("-")[1])
				});
				if (typeof match !== 'undefined') {
					match.basicInfo = responseObj.data.basicInfo;
					items.push(match);
					self.broadcastItems();
				}
            } else {
                console.log("Error getting BusRoute connections " + response.statusCode);
                fetchFailedCallback(self, error);
            }
        });

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