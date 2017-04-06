/* Magic Mirror
 * Fetcher
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var request = require("request");
var querystring = require('querystring');

var etaUrl = "http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx/?"

/* Fetcher
 * Responsible for requesting an update on the set interval and broadcasting the data.
 *
 * attribute url string - URL of the news feed.
 * attribute reloadInterval number - Reload interval in milliseconds.
 */

var Fetcher = function(stopInfo, reloadInterval) {
	var self = this;
	if (reloadInterval < 1000) {
		reloadInterval = 1000;
	}

	var reloadTimer = null;
	var items = [];

	var fetchFailedCallback = function() {};
	var itemsReceivedCallback = function() {};

	// Generate Url
	var parseQueryString = {
		action:"geteta",
		lang:1,
		route:stopInfo.Route,
		bound:stopInfo.Bound,
		servicetype:stopInfo.ServiceType,
		bsiCode:stopInfo.BSICode,
		seq:stopInfo.Seq
	};
	url = etaUrl + querystring.stringify(parseQueryString);

	/* private methods */

	/* fetchETA()
	 * Request the ETA.
	 */

	var fetchETA = function() {
		clearTimeout(reloadTimer);
		reloadTimer = null;
		items = [];

		request(url, (error, response, body) => {
			if (response.statusCode === 200) {
				responseObj = JSON.parse(body);
				if (!responseObj || !responseObj.result) {
					console.log("Error obtaining ETA connections " + response.statusCode);
					fetchFailedCallback(self, error);
					scheduleTimer();
				}
				//responseObj.url = url;
				responseObj.stopInfo = stopInfo;
				items.push(responseObj);
	        	self.broadcastItems();
                scheduleTimer();
            } else {
                console.log("Error getting ETA connections " + response.statusCode);
                fetchFailedCallback(self, error);
                scheduleTimer();
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
			fetchETA();
		}, reloadInterval);
	};

	/* public methods */

	/* setReloadInterval()
	 * Update the reload interval, but only if we need to increase the speed.
	 *
	 * attribute interval number - Interval for the update in milliseconds.
	 */
	this.setReloadInterval = function(interval) {
		if (interval > 1000 && interval < reloadInterval) {
			reloadInterval = interval;
		}
	};

	/* startFetch()
	 * Initiate fetchETA();
	 */
	this.startFetch = function() {
		fetchETA();
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

	this.route = function() {
		return stopInfo.Route;
	}

	this.items = function() {
		return items[0];
	};
};

module.exports = Fetcher;