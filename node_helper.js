/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

const NodeHelper = require("node_helper");
const ETAFetcher = require("./etafetcher.js");
const BusStopFetcher = require("./busstopfetcher.js");
const Log = require("../../js/logger");

module.exports = NodeHelper.create({
  // Override start method.
  start: function () {
    Log.log("Starting node helper for: " + this.name);
    // Fetchers for all stops
    this.stopFetchers = [];
  },

    // Override socketNotificationReceived received.
    socketNotificationReceived: function (notification, payload) {
    if (notification === "ADD_STOP") {
      this.getStopInfo(payload.stop.stopID, payload.config);
    }
  },

  /**
   * Obtain the route pass through this bus stop
   *
   * @param {object} stopID The stop ID.
   * @param {object} config The configuration object.
   */
  getStopInfo: function (stopID, config) {
    let fetcher;

    if (typeof this.stopFetchers[stopID] === "undefined") {
      Log.log(`Create new stop fetcher for stopID: ${stopID}`);
      fetcher = new BusStopFetcher(stopID);
      fetcher.onReceive((fetcher) => {
        const stopInfo = fetcher.item();

        this.sendSocketNotification("STOP_ITEM", {
          stopID: stopID,
          stopInfo: stopInfo
        });

        // Remove all exising ETA fetchers, if stop info is being updated
        if (this.stopFetchers[stopID].etaFetchers) {
          Object.values(this.stopFetchers[stopID].etaFetchers).forEach(etaFetcher => etaFetcher.clearTimer());
          this.stopFetchers[stopID].etaFetchers = {};
        }

        // Fetch the ETA for the stop
        Object.values(stopInfo).forEach(stops => {
          stops.forEach(stop => {
            this.createETAFetcher(stopID, stop, config);
          });
        });
      });

      fetcher.onError((fetcher, error) => {
        this.sendSocketNotification("FETCH_ERROR", {
          stopID: fetcher.stopID(),
          error: error
        });
      });
      this.stopFetchers[stopID] = {
        Fetcher: fetcher,
        etaFetchers: {}
      };
    } else {
      Log.log(`Use existing Stop fetcher for stopID: ${stopID}`);
      fetcher = this.stopFetchers[stopID]["Fetcher"];
      fetcher.broadcastItems();
    }
    fetcher.startFetch();
  },

  /**
   * Creates a fetcher for collecting ETA info
   *
   * @param {stopID} the stop ID (a string)
   * @param {stop} the stop info (an object)
   * @param {config} the config parameter (an object)
   */
  createETAFetcher: function (stopID, stop, config) {
    const reloadInterval = config.reloadInterval || 5 * 60 * 1000;
    let fetcher = new ETAFetcher(stop, reloadInterval);

    const fetcherKey = JSON.stringify(stop);

    if (!Object.keys(this.stopFetchers[stopID]["etaFetchers"]).includes(fetcherKey)) {
      Log.log(`Create new ETA fetcher for route: ${stop.variant.route.number} - Interval: ${reloadInterval}`);

      fetcher.onReceive(() => {
        this.broadcastETAs();
      });

      fetcher.onError((fetcher, error) => {
        this.sendSocketNotification("FETCH_ERROR", {
          url: stop.route,
          error: error
        });
      });

      this.stopFetchers[stopID]["etaFetchers"][fetcherKey] = fetcher;
    } else {
      Log.log(`Use existing ETA fetcher for route: ${stop.variant.route.number}`);
      fetcher = this.stopFetchers[stopID]["etaFetchers"][fetcherKey];
      fetcher.broadcastItems();
    }
    fetcher.startFetch();
  },

  /*
   * Creates an object with all feed items of the different registered ETAs,
   * and broadcasts these using sendSocketNotification.
   */
  broadcastETAs: function () {
    const stops = Object.entries(this.stopFetchers)
      .map(([key, stopFetcher]) =>
        [key, Object.values(stopFetcher['etaFetchers'])
          .filter((etaFetcher) => etaFetcher.items().length != 0)
          .map((etaFetcher) => etaFetcher.items())]
      )
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

    this.sendSocketNotification("ETA_ITEMS", stops);
  },
});
