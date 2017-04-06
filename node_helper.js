/* Magic Mirror
 * Module: KMB
 *
 * By yo-less
 * MIT Licensed.
 */

const request = require('request');
const NodeHelper = require("node_helper");
var validUrl = require("valid-url");
var Fetcher = require("./Fetcher.js");
var Fetcher_BusStop = require("./Fetcher_BusStop.js");
var Fetcher_BusRoute = require("./Fetcher_BusRoute.js");

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.stopFetchers = [];
        // Fetchers for all ETAs
        this.fetchers = [];
    },
	
    socketNotificationReceived: function(notification, payload) {
        // Request for information
        if (notification === "ADD_STOP") {
            this.getStopInfo(payload.config.stopID);
            return;
        }
    },

    getData: function(options, stopID) {
		request(options, (error, response, body) => {
	        if (response.statusCode === 200) {
                this.sendSocketNotification("KMBETA" + stopID, JSON.parse(body));
            } else {
                console.log("Error getting tram connections " + response.statusCode);
            }
        });
    },

    getStopInfo: function(stopID) {
        var self = this;

        var reloadInterval = config.reloadInterval || 5 * 60 * 1000;

        var fetcher;
        if (typeof self.stopFetchers[stopID] === "undefined") {
            console.log("Create new Stop fetcher for stopID: " + stopID + " - Interval: " + reloadInterval);
            fetcher = new Fetcher_BusStop(stopID, reloadInterval);

            fetcher.onReceive(function(fetcher) {
                var items = fetcher.items();
                var stopID = fetcher.stopID();
                for (var f in items) {
                    var routes = items[f].data;
                    for (var f in routes) {
                        var route = routes[f];
                        self.createRouteFetcher(route, stopID);
                    }
                }
            });

            fetcher.onError(function(fetcher, error) {
                self.sendSocketNotification("FETCH_ERROR", {
                    url: fetcher.url(),
                    error: error
                });
            });

            self.stopFetchers[stopID] = fetcher;
        } else {
            console.log("Use existing Stop fetcher for stopID: " + stopID);
            fetcher = self.stopFetchers[stopID];
            fetcher.setReloadInterval(reloadInterval);
            fetcher.broadcastItems();
        }

        fetcher.startFetch();
    },

    /* createFetcher(url, reloadInterval)
     * Creates a fetcher for a new url if it doesn't exist yet.
     * Otherwise it reoses the existing one.
     *
     * attribute url string - URL of the news feed.
     * attribute reloadInterval number - Reload interval in milliseconds.
     */
    createFetcher: function(stopInfo) { 
        var self = this;

        //var reloadInterval = config.reloadInterval || 5 * 60 * 1000;
        var reloadInterval = 5 * 60 * 1000;

        var fetcher = new Fetcher(stopInfo, reloadInterval);
        var url = fetcher.url();

        if (!validUrl.isUri(url)) {
            self.sendSocketNotification("INCORRECT_URL", url);
            return;
        }

        if (typeof self.fetchers[url] === "undefined") {
            console.log("Create new ETA fetcher for url: " + url + " - Interval: " + reloadInterval);
            fetcher.onReceive(function(fetcher) {
                self.broadcastETAs();
            });

            fetcher.onError(function(fetcher, error) {
                self.sendSocketNotification("FETCH_ERROR", {
                    url: fetcher.url(),
                    error: error
                });
            });

            self.fetchers[url] = fetcher;
        } else {
            console.log("Use existing ETA fetcher for url: " + url);
            fetcher = self.fetchers[url];
            fetcher.broadcastItems();
        }

        fetcher.startFetch();
    },

    /* createRouteFetcher(route, stopID)
     * Creates a fetcher for a new url if it doesn't exist yet.
     * Otherwise it reoses the existing one.
     *
     * attribute url string - URL of the news feed.
     * attribute busStop number - BusStopID
     */
    createRouteFetcher: function(route, stopID) {
        var self = this;

        var fetcher;
        fetcher = new Fetcher_BusRoute(route, stopID);

        fetcher.onReceive(function(fetcher) {
            //console.log("createRouteFetcher: " + fetcher.items()[0]);
            self.createFetcher(fetcher.items()[0]);
        });

        fetcher.onError(function(fetcher, error) {
            self.sendSocketNotification("FETCH_ERROR", {
                url: fetcher.url(),
                error: error
            });
        });

        fetcher.startFetch();
    },


    /* broadcastETAs()
     * Creates an object with all feed items of the different registered ETAs,
     * and broadcasts these using sendSocketNotification.
     */
    broadcastETAs: function() {
        var etas = [];
        for (var f in this.fetchers) {
            if (this.fetchers[f].items() == null)
                continue;
            etas.push(this.fetchers[f].items());
        }
        this.sendSocketNotification("ETA_ITEMS", etas);
    },

});