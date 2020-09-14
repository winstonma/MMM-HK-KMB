/* Magic Mirror
 * Module: MMM-HK-Transport
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const ETAFetcher = require("./etafetcher.js");
const BusStopFetcher = require("./busstopfetcher.js");
const Log = require("../../js/logger");

module.exports = NodeHelper.create({

  start: function () {
    Log.log("Starting node helper for: " + this.name);
    // Fetchers for all stops
    this.stopFetchers = [];
  },

  socketNotificationReceived: function (notification, payload) {
    // Request for information
    if (notification === "ADD_STOP") {
      this.getStopInfo(payload.stop.stopID, payload.config);
    }
  },

  /* getStopInfo(stopID, config)
   * Obtain the route that pass through this bus stop
   *
   * attribute stopID string - The stopID of the bus stop
   * attribute config object - A configuration object containing reload interval in milliseconds.
   */
  getStopInfo: function (stopID, config) {
    const self = this;
    let fetcher;

    if (typeof self.stopFetchers[stopID] === "undefined") {
      Log.log("Create new stop fetcher for stopID: " + stopID);
      fetcher = new BusStopFetcher(stopID);
      fetcher.onReceive(function (fetcher) {
        const stopInfoMap = new Map(Object.entries(fetcher.item()));

        const stopInfoMapSorted = new Map([...stopInfoMap.entries()].sort((a, b) => {
          const stopRouteA = a[1][0];
          const stopRouteB = b[1][0];
          if (stopRouteA.stop.sequence != stopRouteB.stop.sequence) {
            if (stopRouteA.stop.sequence === "999")
              return 1;
            if (stopRouteB.stop.sequence === "999")
              return -1;
          }
          if (stopRouteA.stop.id != stopRouteB.stop.id) {
            return stopRouteA.stop.id > stopRouteB.stop.id ? 1 : -1;
          }
          if (stopRouteA.variant.route.number < stopRouteB.variant.route.number)
            return -1;
          return 1;
        }));

        const stopName = new Map(
          [...stopInfoMapSorted]
            .filter(([k, v]) => v[0].stop.id == stopID)
        ).values().next().value[0].stop.name;

        const stopInfoSorted = Array.from(stopInfoMapSorted).reduce((obj, [key, value]) => (
          Object.assign(obj, { [key]: value })
        ), {});
        self.sendSocketNotification("STOP_ITEM", {
          stopID: stopID,
          stopName: stopName,
          stopInfo: stopInfoSorted
        });
        for (const [key, stop] of Object.entries(fetcher.item())) {
          // Find the stop info
          if (!('stopInfo' in self.stopFetchers[stopID]) && (stop[0].stop.id === stopID)) {
            self.stopFetchers[stopID].stopInfo = stop[0].stop;
          }
          self.createETAFetcher(stopID, stop[0]);
        }
      });
      fetcher.onError(function (fetcher, error) {
        self.sendSocketNotification("FETCH_ERROR", {
          stopID: fetcher.stopID(),
          error: error
        });
      });
      self.stopFetchers[stopID] = {
        Fetcher: fetcher,
        etaFetchers: {}
      };
    } else {
      Log.log("Use existing Stop fetcher for stopID: " + stopID);
      fetcher = self.stopFetchers[stopID]["Fetcher"];
      fetcher.broadcastItems();
    }
    fetcher.startFetch();
  },

  /* Creates a fetcher for collecting ETA info
   *
   * @param {stopID} the stop ID (a string)
   * @param {stop} the stop info (an object)
   */
  createETAFetcher: function (stopID, stop) {
    const self = this;

    const reloadInterval = 60 * 1000;
    let fetcher = new ETAFetcher(stop, reloadInterval);

    const fetcherKey = JSON.stringify(stop.variant);

    if (!Object.keys(self.stopFetchers[stopID]["etaFetchers"]).includes(fetcherKey)) {
      Log.log("Create new ETA fetcher for route: " + stop.variant.route.number + " - Interval: " + reloadInterval);
      fetcher.onReceive(function (fetcher) {
        self.broadcastETAs();
      });
      fetcher.onError(function (fetcher, error) {
        self.sendSocketNotification("FETCH_ERROR", {
          url: fetcher.url(),
          error: error
        });
      });

      self.stopFetchers[stopID]["etaFetchers"][fetcherKey] = fetcher;
    } else {
      Log.log("Use existing ETA fetcher for route: " + stop.variant.route.number);
      fetcher = self.stopFetchers[stopID]["etaFetchers"][fetcherKey];
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

    for (const [stopID, stopFetcher] of Object.entries(self.stopFetchers)) {
      let etas = [];
      for (const [etcherKey, etaFetcher] of Object.entries(stopFetcher['etaFetchers'])) {
        if (etaFetcher.items().length != 0) {
          etas.push(etaFetcher.items());
        }
      }
      stops[stopID] = {
        etas: etas,
        stopInfo: self.stopFetchers[stopID].stopInfo
      };
    }
    self.sendSocketNotification("ETA_ITEMS", stops);
  },
});
