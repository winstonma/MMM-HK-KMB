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
        // Use the sorting function to arrange the bus route within the stop
        const stopInfoSorted = Object.fromEntries(Object.entries(fetcher.item())
          .sort(([,[a]], [,[b]]) => {
            if (a.stop.sequence != b.stop.sequence) {
              if (a.stop.sequence === "999")
                return 1;
              if (b.stop.sequence === "999")
                return -1;
            }
            if (a.stop.id != b.stop.id) {
              return a.stop.id > b.stop.id ? 1 : -1;
            }
            return (a.variant.route.number < b.variant.route.number) ? -1 : 1;
          })
        );

        const stopName = Object.values(stopInfoSorted).find(v => v[0].stop.id == stopID)[0].stop.name;

        self.sendSocketNotification("STOP_ITEM", {
          stopID: stopID,
          stopName: stopName,
          stopInfo: stopInfoSorted
        });

        // Fetch the ETA for the stop
        Object.values(stopInfoSorted).forEach(stops => {
          stops.forEach(stop => {
            self.createETAFetcher(stopID, stop);
          });
        });
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

    const fetcherKey = JSON.stringify(stop);

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

    const stops = Object.fromEntries(Object.entries(self.stopFetchers)
      .map(([key, stopFetcher]) =>
        [key, Object.values(stopFetcher['etaFetchers'])
          .filter((etaFetcher) => etaFetcher.items().length != 0)
          .map((etaFetcher) => etaFetcher.items())]
      )
    );

    self.sendSocketNotification("ETA_ITEMS", stops);
  },
});
