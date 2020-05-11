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

const querystring = require('querystring');
const got = require('got');


module.exports = NodeHelper.create({

  start: async function () {
    console.log("Starting node helper for: " + this.name);
    // Fetchers for all stops
    this.stopFetchers = [];
    // Fetchers for all ETAs
    this.etaFetchers = [];
    // All Stops info
    this.AllStopsInfo = await this.getStopsInfo();
  },

  getStopsInfo: async function () {
    const baseUrl = "http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?";
    const parseQueryString = {
      action: "getallstops"
    };
    const url = baseUrl + querystring.stringify(parseQueryString);

    try {
      const { body } = await got.post(url, {
        responseType: 'json'
      });
      return body.data.stops;
    } catch (error) {
      console.log(error.response.body);
    }
  },

  socketNotificationReceived: function (notification, payload) {
    // Request for information
    if (notification === "ADD_STOPS") {
      payload.config.map((item) => {
        this.getStopInfo(item.stopID)
      });
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
   *
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
        fetcher.items().map((info) => {
          const routeList = info.data.map((route) => route.trim());
          routeList.map((route) => self.createRouteFetcher(route, stopID));
        })
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

  /* createRouteFetcher(route, stopID, stopName)
   * Creates a fetcher for obtaining the route info
   *
   * attribute route string - The route number
   * attribute stopID string - Bus Stop ID
   * attribute stopName string - Bus Stop Name
   */
  createRouteFetcher: function (route, stopID) {
    var self = this;
    var fetcher;
    fetcher = new BusRouteFetcher(route, stopID);

    // Find the stop name
    const stopInfo = self.AllStopsInfo.filter((stop) => stop.BSICode === stopID)[0];
    const stopName = stopInfo.CName;

    fetcher.onReceive(function (fetcher) {
      // Keep relevant bounds and find the stop name
      fetcher.items().filter((routeInfo) => {
        // Finding the matching stops from the bus route
        let match = routeInfo.routeStops.filter((stop) => {
          // It should not happen
          if (stopName === '')
            return false;

          return (stop.BSICode.split("-")[0] === stopID.split("-")[0] &&
            stop.BSICode.split("-")[1] === stopID.split("-")[1] &&
            stop.CName == stopName
          );
        });

        if (match.length >= 1) {
          // If there are more than 1 stops, then we need exact BSI-Code match
          match = match.filter((stop) => {
            return (stop.BSICode === stopID);
          });
        }

        switch (match.length) {
          case 0:
            break;
          case 1:
            match[0].basicInfo = routeInfo.basicInfo;
            self.createETAFetcher(match[0]);
            break;
          default:
            console.log("It shouldn't be happening")
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
