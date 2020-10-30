/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * AGPL-3.0 Licensed.
 */

// String replacer
const BUSLINELOOKUP = {
  //en
  "KMB": "<sup>K</sup>",
  "CTB": "<sup>C</sup>",
  "NWFB": "<sup>N</sup>",
  "Scheduled": "*",
  // zh-tw
  "新巴": "<sup>新</sup>",
  "九巴": "<sup>九</sup>",
  "城巴": "<sup>城</sup>",
  "預定班次": "*",
  // zh-cn
  "预定班次": "*"
};

Module.register("MMM-HK-KMB", {
  // Default module config.
  defaults: {
    stops: [
      {
        stopID: 'HO06-S-1250-0',
      }
    ],
    timeFormat: (config.timeFormat !== 24) ? "h:mm" : "HH:mm",
    hideInactiveRoute: true,        // hide inactive route
    showLabelRow: true,
    reloadInterval: 1 * 60 * 1000,  // every 1 minute
  },

  // Define required scripts.
  getScripts: function () {
    return ["moment.js"];
  },

  getTranslations: function () {
    return {
      "en": "translations/en.json",
      "de": "translations/de.json",
      "zh-cn": "translations/zh-cn.json",
      "zh-tw": "translations/zh-tw.json",
      "zh-hk": "translations/zh-tw.json"
    };
  },

  getStyles: function () {
    return ["MMM-HK-KMB.css", "font-awesome.css"];
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    // Collect the stop info (including the routes that the stop)
    this.stopInfo = {};

    this.registerStops();
  },

  /*
   * registers the stops to be used by the backend.
   */
  registerStops: function () {
    Object.values(this.config.stops).forEach((stop) => {
      this.sendSocketNotification("ADD_STOP", {
        stop: stop,
        config: this.config
      });
    });
  },

  /**
   * Generate an ordered list of items for this configured module.
   *
   * @param {object} etas An object with ETAs returned by the node helper.
   */
  generateETAInfo: function (eta) {
    let dataUpdated = false;

    Object.entries(this.stopInfo).forEach(([stopID, stopInfo]) => {
      if (eta[stopID]) {
        dataUpdated = true;
        Object.values(stopInfo.stopInfo).forEach(routeInfo => {
          routeInfo.etas = eta[stopID].find(([x,]) =>
            ((JSON.stringify(x.stopping.stop) === JSON.stringify(routeInfo.stop)) &&
              (JSON.stringify(x.stopping.variant) === JSON.stringify(routeInfo.variant)))
          );
        });
      }
    });

    if (dataUpdated)
      this.updateDom();
  },

  /**
   * Generate an ordered list of items for this configured module.
   *
   * @param {object} stop An object with stop returned by the node helper.
   */
  generateStopInfo: function (stop) {
    if (this.subscribedToBusStop(stop.stopID)) {
      // Sort the stopInfo
      stop.stopInfo = Object.entries(stop.stopInfo)
        .sort(([, a], [, b]) => {
          if (a.stop.id != b.stop.id)
            return (a.stop.id > b.stop.id) ? 1 : -1;

          if (a.variant.route.number != b.variant.route.number)
            return (a.variant.route.number < b.variant.route.number) ? -1 : 1;

          if (a.stop.sequence != b.stop.sequence) {
            if (a.stop.sequence === "999")
              return -1;
            else if (b.stop.sequence === "999")
              return 1;
            else
              return (a.stop.sequence > b.stop.sequence) ? 1 : -1;
          }
        })
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

      // Add the stopName
      stop.stopName = stop.stopName;
      this.stopInfo[stop.stopID] = stop;

      this.updateDom();
    }
  },

  /**
   * Check if this module is configured to show this stop.
   *
   * @param {string} stopID stopID to check.
   * @returns {boolean} True if it is subscribed, false otherwise
   */
  subscribedToBusStop: function (stopID) {
    return this.config.stops.some(element => element.stopID === stopID);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "ETA_ITEMS") {
      this.generateETAInfo(payload);
    } else if (notification === "STOP_ITEM") {
      this.generateStopInfo(payload);
    } else if (notification === "FETCH_ERROR") {
      Log.error("MMM-HK-KMB Error. Could not fetch Stop: " + payload.url);
      this.loaded = true;
    } else if (notification === "INCORRECT_URL") {
      Log.error("MMM-HK-KMB Error. Incorrect url: " + payload.url);
    }
  },

  // Override dom generator.
  getDom: function () {
    let wrapper = document.createElement("div");

    if (Object.keys(this.stopInfo).length === 0) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = this.config.tableClass + " dimmed";
      return wrapper;
    }

    Object.entries(this.stopInfo).forEach(([stopID, stopInfo]) => {
      this.data.header = stopInfo.stopName;

      // Start creating connections table
      let table = document.createElement("table");
      table.classList.add("small", "table");
      table.border = '0';

      const stopConfig = this.config.stops.find(stop => stop.stopID == stopID);
      const showLabelRow = (stopConfig.showLabelRow !== undefined) ? stopConfig.showLabelRow : this.config.showLabelRow;

      if (showLabelRow) {
        table.appendChild(this.createLabelRow());
      }

      table.appendChild(this.createSpacerRow());

      if (Object.keys(stopInfo.stopInfo).length == 0) {
        let row = document.createElement("tr");

        let line = document.createElement("td");
        line.setAttribute("colSpan", "3");
        line.innerHTML = this.translate("LOADING");
        row.appendChild(line);

        table.appendChild(row);
      } else {
        Object.values(stopInfo.stopInfo).forEach(routeInfo => {
          if (routeInfo.etas) {
            const data = this.createDataRow(routeInfo);
            table.appendChild(data);
          }
        });

        const hideInactiveRoute = (stopConfig.hideInactiveRoute !== undefined) ? stopConfig.hideInactiveRoute : this.config.hideInactiveRoute;

        let printVar = false;

        // Show routes without active ETA
        if (!hideInactiveRoute) {
          const inactiveRouteNumberList = Object.values(stopInfo.stopInfo)
            .map(routeInfo => (routeInfo.etas !== undefined) ? routeInfo : null)
            .filter(routeInfo => routeInfo !== null)
            .map(routeInfo => routeInfo.variant.route.number);

          if (inactiveRouteNumberList.length > 0) {
            const data = this.createNonActiveRouteRow(inactiveRouteNumberList);
            table.appendChild(data);
          }
        }
      }

      wrapper.appendChild(table);
    });

    return wrapper;
  },

  createLabelRow: function () {
    let labelRow = document.createElement("tr");

    let lineLabel = document.createElement("th");
    lineLabel.className = "line";
    lineLabel.innerHTML = this.translate("LINE");
    labelRow.appendChild(lineLabel);

    let destinationLabel = document.createElement("th");
    destinationLabel.className = "destination";
    destinationLabel.innerHTML = this.translate("DESTINATION");
    labelRow.appendChild(destinationLabel);

    let departureLabel = document.createElement("th");
    departureLabel.className = "departure";
    departureLabel.innerHTML = this.translate("DEPARTURE");
    labelRow.appendChild(departureLabel);

    return labelRow;
  },

  createSpacerRow: function () {
    let spacerRow = document.createElement("tr");

    let spacerHeader = document.createElement("th");
    spacerHeader.className = "spacerRow";
    spacerHeader.setAttribute("colSpan", "3");
    spacerHeader.innerHTML = "";
    spacerRow.appendChild(spacerHeader);

    return spacerRow;
  },

  createNonActiveRouteRow: function (nonActiveRoute) {
    let labelRow = document.createElement("tr");
    labelRow.className = "dimmed light xsmall"

    let lineLabel = document.createElement("td");
    lineLabel.setAttribute("colSpan", "3");
    lineLabel.innerHTML = nonActiveRoute.join(', ');
    labelRow.appendChild(lineLabel)

    return labelRow;
  },

  createDataRow: function (routeObj) {
    if (!routeObj || routeObj.length == 0)
      return null;

    let row = document.createElement("tr");

    let line = document.createElement("td");
    line.className = "line";
    line.innerHTML = routeObj.variant.route.number;
    if (routeObj.sequence == 999)
      line.innerHTML += '<sup><i class="fas fa-sign"></i></sup>';
    row.appendChild(line);

    let destination = document.createElement("td");
    destination.className = "destination";
    destination.innerHTML = routeObj.variant.destination;
    row.appendChild(destination);

    let departure = document.createElement("td");
    departure.className = "departure";
    const etaArray = routeObj.etas.map((etaInfoItem) => {
      const etaStr = moment(etaInfoItem.time).format(this.config.timeFormat);
      const remarkStr = this.replaceAll(etaInfoItem.remark, BUSLINELOOKUP).replace(/\s/g, '');
      return (etaStr + remarkStr);
    });
    departure.innerHTML = etaArray.toString();
    row.appendChild(departure);

    return row;
  },

  replaceAll: (str, mapObj) => {
    const re = new RegExp(Object.keys(mapObj).join("|"), "gi");

    return str.replace(re, function (matched) {
      return mapObj[matched];
    });
  },
});
