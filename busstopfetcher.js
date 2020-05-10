/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

var request = require("request");
var querystring = require('querystring');
var schedule = require('node-schedule');

var baseUrl = "http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?";

var BusStopFetcher = function (stopID, reloadInterval) {
	var self = this;
	if (reloadInterval < 1000) {
		reloadInterval = 1000;
	}

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
		url = baseUrl + querystring.stringify(parseQueryString);
		reloadTimer = null;
		items = [];

		request.post(url, (error, response, body) => {
			if (error) {
				console.log("Error obtaining BusStop connections: " + error);
				fetchFailedCallback(self, error);
			}
			responseObj = JSON.parse(body);
			if (!responseObj || !responseObj.result) {
				console.log("Error obtaining BusStop connections " + response.statusCode);
				fetchFailedCallback(self, error);
			} else {
				responseObj.url = url;
				items.push(responseObj);
				self.broadcastItems();
			}
		});

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
		console.log('Broadcasting ' + items.length + ' items.');
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