/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
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
    inactiveRouteCountPerRow: 0,   // how many inactive route would be displayed, 0 means hide all inactive route
    labelRow: true,
    reloadInterval: 1 * 60 * 1000, // every 1 minute
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
    return ["MMM-HK-KMB.css"];
  },

  start: function () {
    var self = this;
    Log.info("Starting module: " + this.name);

    // Collect the stop info (including the routes that the stop)
    this.stopInfo = {};

    this.registerStops();
  },

  /* registerStops()
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

  socketNotificationReceived: function (notification, payload) {
    if (notification === "ETA_ITEMS") {
      Object.entries(this.stopInfo).forEach(([stopID, stopInfo]) => {
        if (payload[stopID]) {
          Object.values(stopInfo.stopInfo).forEach(routeInfos => {
            routeInfos.forEach(routeInfo => {
              routeInfo.etas = payload[stopID].find(([x,]) =>
                ((JSON.stringify(x.stopRoute.stop) === JSON.stringify(routeInfo.stop)) &&
                  (JSON.stringify(x.stopRoute.variant) === JSON.stringify(routeInfo.variant)))
              );
            });
          });
          this.updateDom();
        }
      });
    } else if (notification === "STOP_ITEM") {
      if (this.config.stops.find(element => element.stopID == payload.stopID) != undefined) {
        this.stopInfo[payload.stopID] = payload;
        this.updateDom();
      }
    } else if (notification === "FETCH_ERROR") {
      Log.error("Calendar Error. Could not fetch calendar: " + payload.url);
      this.loaded = true;
    } else if (notification === "INCORRECT_URL") {
      Log.error("Calendar Error. Incorrect url: " + payload.url);
    }
  },

  getDom: function () {
    let wrapper = document.createElement("div");

    if (Object.keys(this.stopInfo).length === 0) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = this.config.tableClass + " dimmed";
      return wrapper;
    }

    Object.values(this.stopInfo).forEach((stopInfo) => {
      let header = document.createElement("header");
      header.innerHTML = this.config.stopName ?? stopInfo.stopName;
      wrapper.appendChild(header);

      // Start creating connections table
      let table = document.createElement("table");
      table.classList.add("small", "table");
      table.border = '0';

      table.appendChild(this.createLabelRow());

      table.appendChild(this.createSpacerRow());

      if (Object.keys(stopInfo.stopInfo).length == 0) {
        let row = document.createElement("tr");

        let line = document.createElement("td");
        line.colSpan = 3;
        line.innerHTML = this.translate("LOADING");
        row.appendChild(line);

        table.appendChild(row);
      } else {
        Object.values(stopInfo.stopInfo).forEach(routeInfos => {
          routeInfos.forEach(routeInfo => {
            if (routeInfo.etas) {
              const data = this.createDataRow(routeInfo);
              table.appendChild(data);
            }
          });
        });
      }

      if (this.config.inactiveRouteCountPerRow != 0 && nonActiveRoute > 0) {
        table.appendChild(this.createSpacerRow());
        table.appendChild(this.createNonActiveRouteRow(nonActiveRoute));
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
    let labelRows = document.createDocumentFragment();

    // Remove duplicates and sort
    const orderedNonActiveRoute = Array.from(new Set(nonActiveRoute)).sort();
    // Split it into multiple sizes
    const nonActiveRouteDisplayList = this.chunkArrayInGroups(orderedNonActiveRoute, this.config.inactiveRouteCountPerRow);

    nonActiveRouteDisplayList.forEach((nonActiveRouteDisplayRow, count) => {
      let labelRow = document.createElement("tr");

      let lineLabel = document.createElement("th");
      if (count == 0) {
        lineLabel.className = "line";
        lineLabel.innerHTML = this.translate("INACTIVE");
      }
      labelRow.appendChild(lineLabel);

      let destinationLabel = document.createElement("th");
      destinationLabel.className = "destination";
      destinationLabel.innerHTML = nonActiveRouteDisplayRow;
      labelRow.appendChild(destinationLabel);

      labelRows.appendChild(labelRow);
    });

    return labelRows;
  },

  createNoTramRow: function () {
    let noTramRow = document.createElement("tr");

    let noTramHeader = document.createElement("th");
    noTramHeader.className = "noTramRow";
    noTramHeader.setAttribute("colSpan", "3");
    noTramHeader.innerHTML = this.translate("NO-TRAMS");
    noTramRow.appendChild(noTramHeader);

    return noTramRow;
  },

  createDataRow: function (routeObj) {
    if (!routeObj || routeObj.length == 0)
      return null;

    let row = document.createElement("tr");

    let line = document.createElement("td");
    line.className = "line";
    line.innerHTML = routeObj.variant.route.number;
    row.appendChild(line);

    let destination = document.createElement("td");
    destination.className = "destination";
    destination.innerHTML = routeObj.variant.destination;
    row.appendChild(destination);

    let departure = document.createElement("td");
    departure.className = "departure";
    const etaArray = routeObj.etas.map((etaInfoItem) => {
      const etaStr = moment(etaInfoItem.time, 'HH:mm').format(this.config.timeFormat);
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

  chunkArrayInGroups: function (arr, size) {
    let myArray = [];
    for (let i = 0; i < arr.length; i += size) {
      myArray.push(arr.slice(i, i + size));
    }
    return myArray;
  }
});
