/* Magic Mirror
 * Node Helper: MMM-HK-KMB - BusStopFetcher
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

const Log = require("../../js/logger.js");
const cron = require('node-cron');
const Kmb = require('js-kmb-api').default;

/**
 * Responsible for requesting an update and broadcasting the data.
 *
 * @param {string} stopID stop ID of the stop
 * @class
 */
const BusStopFetcher = function (stopID) {
  const self = this;

  let item = null;

  const langTable = {
    'zh-tw': 'zh-hant',
    'zh-hk': 'zh-hant',
    'zh-cn': 'zh-hans'
  }
  const lang = langTable[config.language] || 'en';
  const kmb = new Kmb(lang);
  const stop = stopID ? new kmb.Stop(stopID, null, null) : null;

  // Create a schduler to update the bustop info (every 5am)
  cron.schedule('* 5 * * *', () => {
    Log.log(`BusStop-Fetcher: Fetching stop info for stop ID: ${stopID}`);
    fetchBusStop();
  }, {
    timezone: "Asia/Hong_Kong"
  });

  let fetchFailedCallback = function () { };
  let itemsReceivedCallback = function () { };

  /* private methods */

  /**
   * Request the stop info
   */
  const fetchBusStop = async function () {
    item = await stop.getStoppings();
    self.broadcastItems();
  };

  /* public methods */

	/**
	 * Initiate fetchBusStop();
	 */
  this.startFetch = function () {
    fetchBusStop();
  };

	/**
	 * Broadcast the existing item.
	 */
  this.broadcastItems = function () {
    if (item == null) {
      Log.info("BusStop-Fetcher: No item to broadcast yet.");
      return;
    }
    Log.info(`BusStop-Fetcher: Broadcasting item for stop ID ${stopID}`);
    itemsReceivedCallback(self);
  };

  this.onReceive = function (callback) {
    itemsReceivedCallback = callback;
  };

  this.onError = function (callback) {
    fetchFailedCallback = callback;
  };

  this.stopID = function () {
    return stopID;
  };

  this.item = function () {
    return item;
  };

  this.stopName = function () {
    return stop.name;
  }
};

module.exports = BusStopFetcher;