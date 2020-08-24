/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const validUrl = require("valid-url");
const ETAFetcher = require("./etafetcher.js");
const BusStopFetcher = require("./busstopfetcher.js");

const got = require('got');

module.exports = NodeHelper.create({

  start: function () {
    console.log("Starting node helper for: " + this.name);
    // Fetchers for all stops
    this.stopFetchers = [];
    // All Stops info
    this.AllStopsInfo;

    this.getStopsInfo();
  },

  /*
   * Obtain the info of all bus stops
   */
  getStopsInfo: async function () {
    const self = this;

    const routeStopCheckUrl = "https://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx?";

    const parseQueryString = {
      action: "getallstops"
    };

    (async () => {
      try {
        const { body } = await got.post(routeStopCheckUrl, {
          searchParams: parseQueryString,
          responseType: 'json'
        });
        this.AllStopsInfo = body.data.stops;
      } catch (error) {
        console.log("Error obtaining BusRoute connections: " + error);
        this.AllStopsInfo = [];
      }
    })();
  },

  socketNotificationReceived: function (notification, payload) {
    // Request for information
    if (notification === "ADD_STOPS") {
      payload.config.map((item) => {
        this.getStopInfo(item.stopID)
      });
    }
  },

  getData: function (options, stopID) {
    (async () => {
      try {
        const { body } = await got(options, {
          responseType: 'json'
        });
        this.sendSocketNotification("KMBETA" + stopID, JSON.parse(body));
      } catch (error) {
        console.log("Error getting ETA connections " + response.statusCode);
      }
    })();
  },

  /*
   * Obtain the route that pass through this bus stop
   *
   * @param {stopID} the stop ID of the bus stop
   */
  getStopInfo: function (stopID) {
    let self = this;
    let fetcher;

    if (typeof self.stopFetchers[stopID] === "undefined") {
      console.log("Create new stop fetcher for stopID: " + stopID);
      fetcher = new BusStopFetcher(stopID);
      fetcher.onReceive(function (fetcher) {
        for (const [key, stop] of Object.entries(fetcher.item())) {
          self.createETAFetcher(stopID, stop[0]);
        }
      });
      fetcher.onError(function (fetcher, error) {
        self.sendSocketNotification("FETCH_ERROR", {
          stopID: fetcher.stopID(),
          error: error
        });
      });
      const stopInfo = this.AllStopsInfo.filter((stopInfo) => {
        return (stopID.includes(stopInfo.BSICode));
      })[0];
      self.stopFetchers[stopID] = {
        Fetcher: fetcher,
        stopInfo: stopInfo,
        etaFetchers: {}
      };
    } else {
      console.log("Use existing Stop fetcher for stopID: " + stopID);
      fetcher = self.stopFetchers[stopID]["Fetcher"];
      fetcher.broadcastItems();
    }
    fetcher.startFetch();
  },

  /* Creates a fetcher for collecting ETA info
   *
   * @param {stopInfo} the stop info (an object)
   */
  createETAFetcher: function (stopID, stop) {
    const self = this;

    const reloadInterval = 60 * 1000;
    let fetcher = new ETAFetcher(stop, reloadInterval);

    const fetcherKey = JSON.stringify(stop.variant);

    if (!Object.keys(this.stopFetchers[stopID]["etaFetchers"]).includes(fetcherKey)) {
      console.log("Create new ETA fetcher for route: " + stop.variant.route.number + " - Interval: " + reloadInterval);
      fetcher.onReceive(function (fetcher) {
        self.broadcastETAs();
      });
      fetcher.onError(function (fetcher, error) {
        self.sendSocketNotification("FETCH_ERROR", {
          url: fetcher.url(),
          error: error
        });
      });

      this.stopFetchers[stopID]["etaFetchers"][fetcherKey] = fetcher;
    } else {
      console.log("Use existing ETA fetcher for route: " + stop.variant.route.number);
      fetcher = this.stopFetchers[stopID]["etaFetchers"][fetcherKey];
      fetcher.broadcastItems();
    }
    fetcher.startFetch();
  },

  /* broadcastETAs()
   * Creates an object with all feed items of the different registered ETAs,
   * and broadcasts these using sendSocketNotification.
   */
  broadcastETAs: function () {
    const self = this;
    let stops = {};

    for (const [stopID, stopFetcher] of Object.entries(this.stopFetchers)) {
      let etas = [];
      for (const [etcherKey, etaFetcher] of Object.entries(stopFetcher['etaFetchers'])) {
        if (etaFetcher.items().length != 0) {
          etas.push(etaFetcher.items());
        }
      }
      stops[stopID] = {
        stopInfo: stopFetcher["stopInfo"],
        etas: etas
      };
    }
    this.sendSocketNotification("ETA_ITEMS", stops);
  },
});
