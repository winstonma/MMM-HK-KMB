/* Magic Mirror
 * Module: KMB
 *
 * By yo-less
 * MIT Licensed.
 */
const request = require('request');
const NodeHelper = require("node_helper");
const validUrl = require("valid-url");
const ETAFetcher = require("./etafetcher.js");
const BusStopFetcher = require("./busstopfetcher.js");
const BusRouteFetcher = require("./busroutefetcher.js");

module.exports = NodeHelper.create({

  start: function () {
    console.log("Starting node helper for: " + this.name);
    // Fetchers for all stops
    this.stopFetchers = [];
    // Fetchers for all ETAs
    this.etaFetchers = [];
    // Stores the lookup of Stop ID and Stop Name
    this.stopName = [];
  },

  socketNotificationReceived: function (notification, payload) {
    // Request for information
    if (notification === "ADD_STOPS") {
      for (var f in payload.config) {
        var stopID = payload.config[f].stopID;
        // Create a new entry with no stop name
        this.stopName[stopID] = '';
        this.getStopInfo(stopID);
      }
      return;
    }
  },

  getData: function (options, stopID) {
    request(options, (error, response, body) => {
      if (response.statusCode === 200) {
        this.sendSocketNotification("KMBETA" + stopID, JSON.parse(body));
      } else {
        console.log("Error getting tram connections " + response.statusCode);
      }
    });
  },

  /*
   * Obtain the route that pass through this bus stop
   * @param {stopID} the stop ID of the bus stop
   */
  getStopInfo: function (stopID) {
    var self = this;
    var reloadInterval = config.reloadInterval || 5 * 60 * 1000;
    var fetcher;
    if (typeof self.stopFetchers[stopID] === "undefined") {
      console.log("Create new stop fetcher for stopID: " + stopID + " - Interval: " + reloadInterval);
      fetcher = new BusStopFetcher(stopID, reloadInterval);
      fetcher.onReceive(function (fetcher) {
        const items = fetcher.items();
        const stopID = fetcher.stopID();
        for (var f in items) {
          var routes = items[f].data;
          routes.map((route) => self.createRouteFetcher(route.trim(), stopID));
        }
      });
      fetcher.onError(function (fetcher, error) {
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

  /* Creates a fetcher for collecting ETA info
   *
   * @param {stopInfo} the stop info (an object)
   */
  createETAFetcher: function (stopInfo) {
    var self = this;

    const reloadInterval = 60 * 1000;
    var fetcher = new ETAFetcher(stopInfo, reloadInterval);

    const url = fetcher.url();
    if (!validUrl.isUri(url)) {
      self.sendSocketNotification("INCORRECT_URL", url);
      return;
    }

    if (typeof self.etaFetchers[url] === "undefined") {
      console.log("Create new ETA fetcher for url: " + url + " - Interval: " + reloadInterval);
      fetcher.onReceive(function (fetcher) {
        self.broadcastETAs();
      });
      fetcher.onError(function (fetcher, error) {
        self.sendSocketNotification("FETCH_ERROR", {
          url: fetcher.url(),
          error: error
        });
      });
      self.etaFetchers[url] = fetcher;
    } else {
      console.log("Use existing ETA fetcher for url: " + url);
      fetcher = self.etaFetchers[url];
      fetcher.broadcastItems();
    }
    fetcher.startFetch();
  },

  /* createRouteFetcher(route, stopID)
   * Creates a fetcher for a new url if it doesn't exist yet.
   *
   * attribute url string - URL of the news feed.
   * attribute busStop number - BusStopID
   */
  createRouteFetcher: function (route, stopID) {
    var self = this;
    var fetcher;
    fetcher = new BusRouteFetcher(route, stopID);
    fetcher.onReceive(function (fetcher) {
      // Keep relevant bounds and find the stop name
      fetcher.items().filter((routeInfo) => {
        // Find out the stop name
        if (self.stopName[stopID] === '') {
          const match = routeInfo.routeStops.filter(stops => stops.BSICode === stopID);
          if (match.length == 1) {
            // Find the exact match, store the stop name
            self.stopName[stopID] = match[0].CName;
          }
        }

        // Finding the matching stops from the bus route
        const match = routeInfo.routeStops.filter((stops) => {
          if (self.stopName[stopID] === '')
            return false;

          return (stops.BSICode.split("-")[0] === stopID.split("-")[0] &&
            stops.BSICode.split("-")[1] === stopID.split("-")[1] &&
            stops.CName == self.stopName[stopID]
          );
        });

        if (match.length >= 1) {
          match.map((info) => {
            info.basicInfo = routeInfo.basicInfo;
            self.createETAFetcher(info);
          });
        }
      });
    });
    fetcher.onError(function (fetcher, error) {
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
  broadcastETAs: function () {
    let etas = [];
    for (const [url, fetcher] of Object.entries(this.etaFetchers)) {
      if (fetcher.items() != null) {
        etas.push(fetcher.items());
      }
    }
    this.sendSocketNotification("ETA_ITEMS", etas);
  },
});
