/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 */

// String replacer
const BUSLINELOOKUP = {
  "新巴": "<sup>新</sup>",
  "九巴": "<sup>九</sup>",
  "城巴": "<sup>城</sup>",
  "預定班次": "*"
};

// No bus indicator
const NOBUSINDICATORLIST = [
  "暫時沒有預定班次",
  "此路線只於"
]

Module.register("MMM-HK-KMB", {

  defaults: {
    stops: [
      {
        stopID: 'HO06-S-1250-0',
      }
    ],
    inactiveRouteCountPerRow: 0,   // how many inactive route would be displayed, 0 means hide all inactive route
    labelRow: true,
    reloadInterval: 1 * 60 * 1000, // every 1 minute
  },

  getTranslations: function () {
    return {
      "de": "translations/de.json",
      "en": "translations/en.json",
      "zh": "translations/zh.json"
    };
  },

  getStyles: function () {
    return ["MMM-HK-KMB.css"];
  },

  start: function () {
    var self = this;
    Log.info("Starting module: " + this.name);

    // Collect the stop info (including the routes that the stop)
    this.etaItems = [];
    this.activeItem = 0;

    this.sendSocketNotification("ADD_STOPS", {
      config: this.config.stops
    });

    //this.registerETAs();
  },

  /* registerETAs()
   * registers the feeds to be used by the backend.
   */
  registerETAs: function () {
    for (var f in this.config.ETAs) {
      var eta = this.config.ETAs[f];
      this.sendSocketNotification("ADD_ETA", {
        feed: eta,
        config: this.config
      });
    }
  },


  socketNotificationReceived: function (notification, payload) {
    if (notification === "ETA_ITEMS") {
      // The feed itself contains all the ETAs
      this.etaItems = payload.sort(function (a, b) {
        if (a.stopInfo.Seq != b.stopInfo.Seq) {
          if (a.stopInfo.Seq === "999")
            return 1;
          if (b.stopInfo.Seq === "999")
            return -1;
        }
        if (a.stopInfo.BSICode > b.stopInfo.BSICode)
          return -1;
        if (a.stopInfo.BSICode < b.stopInfo.BSICode)
          return 1;
        if (a.stopInfo.Route < b.stopInfo.Route)
          return -1;
        return 1;
      });
      this.updateDom();
    }
  },

  /* subscribedToFeed(feedUrl)
   * Check if this module is configured to show this feed.
   *
   * attribute feedUrl string - Url of the feed to check.
   *
   * returns bool
   */
  subscribedToFeed: function (feedUrl) {
    for (var f in this.config.ETAs) {
      var feed = this.config.ETAs[f];
      if (feed.url === feedUrl) {
        return true;
      }
    }
    return false;
  },

  /* subscribedToFeed(feedUrl)
   * Returns title for a specific feed Url.
   *
   * attribute feedUrl string - Url of the feed to check.
   *
   * returns string
   */
  titleForFeed: function (feedUrl) {
    for (var f in this.config.ETAs) {
      var feed = this.config.ETAs[f];
      if (feed.url === feedUrl) {
        return feed.title || "";
      }
    }
    return "";
  },

  getDom: function () {

    var wrapper = document.createElement("div");

    if (this.activeItem >= this.etaItems.length) {
      this.activeItem = 0;
    }

    // Actually it is a new redraw
    if (this.etaItems === null) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "small dimmed";
      return wrapper;
    }

    var header = document.createElement("header");
    header.innerHTML = (this.etaItems.length > 0) ? this.etaItems[0].stopInfo.CName : this.config.stopName;
    wrapper.appendChild(header);

    // Start creating connections table
    var table = document.createElement("table");
    table.classList.add("small", "table");
    table.border = '0';

    table.appendChild(this.createLabelRow());

    table.appendChild(this.createSpacerRow());

    let nonActiveRoute = [];

    for (t in this.etaItems) {
      var etaObj = this.etaItems[t];

      if (etaObj.response.length == 1 && this.containsAny(etaObj.response[0].t, NOBUSINDICATORLIST)) {
        // Route with no active ETA
        nonActiveRoute.push(etaObj.stopInfo.Route);
      } else {
        data = this.createDataRow(etaObj);
        if (data != null)
          table.appendChild(data);
      }
    }

    if (this.config.inactiveRouteCountPerRow != 0) {
      table.appendChild(this.createSpacerRow());
      table.appendChild(this.createNonActiveRouteRow(nonActiveRoute));
    }

    wrapper.appendChild(table);

    return wrapper;
  },

  createLabelRow: function () {
    var labelRow = document.createElement("tr");

    var lineLabel = document.createElement("th");
    lineLabel.className = "line";
    lineLabel.innerHTML = this.translate("LINE");
    labelRow.appendChild(lineLabel);

    var destinationLabel = document.createElement("th");
    destinationLabel.className = "destination";
    destinationLabel.innerHTML = this.translate("DESTINATION");
    labelRow.appendChild(destinationLabel);

    var departureLabel = document.createElement("th");
    departureLabel.className = "departure";
    departureLabel.innerHTML = this.translate("DEPARTURE");
    labelRow.appendChild(departureLabel);

    return labelRow;
  },

  createSpacerRow: function () {
    var spacerRow = document.createElement("tr");

    var spacerHeader = document.createElement("th");
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

      var lineLabel = document.createElement("th");
      if (count == 0) {
        lineLabel.className = "line";
        lineLabel.innerHTML = this.translate("INACTIVE");
      }
      labelRow.appendChild(lineLabel);

      var destinationLabel = document.createElement("th");
      destinationLabel.className = "destination";
      destinationLabel.innerHTML = nonActiveRouteDisplayRow;
      labelRow.appendChild(destinationLabel);

      labelRows.appendChild(labelRow);
    });

    return labelRows;
  },

  createNoTramRow: function () {
    var noTramRow = document.createElement("tr");

    var noTramHeader = document.createElement("th");
    noTramHeader.className = "noTramRow";
    noTramHeader.setAttribute("colSpan", "3");
    noTramHeader.innerHTML = this.translate("NO-TRAMS");
    noTramRow.appendChild(noTramHeader);

    return noTramRow;
  },

  createDataRow: function (routeObj) {
    if (!routeObj || routeObj.length == 0)
      return null;

    var row = document.createElement("tr");

    var line = document.createElement("td");
    line.className = "line";
    line.innerHTML = routeObj.stopInfo.Route;
    row.appendChild(line);

    var destination = document.createElement("td");
    destination.className = "destination";
    destination.innerHTML = routeObj.stopInfo.basicInfo.DestCName;
    row.appendChild(destination);

    etaInfo = routeObj.response;
    if (etaInfo.length > 0) {
      var departure = document.createElement("td");
      departure.className = "departure";
      etaArray = [];
      for (r in etaInfo) {
        let etaStr = etaInfo[r].t;
        const eta = this.replaceAll(etaStr, BUSLINELOOKUP).replace(/\s/g, '');
        etaArray.push(eta);
      }
      departure.innerHTML = etaArray.toString();
      row.appendChild(departure);
    }
    return row;
  },

  replaceAll: function (str, mapObj) {
    var re = new RegExp(Object.keys(mapObj).join("|"), "gi");

    return str.replace(re, function (matched) {
      return mapObj[matched.toLowerCase()];
    });
  },

  containsAny: function (str, items) {
    for (var i in items) {
      var item = items[i];
      if (str.indexOf(item) > -1) {
        return true;
      }

    }
    return false;
  },

  chunkArrayInGroups: function (arr, size) {
    var myArray = [];
    for (var i = 0; i < arr.length; i += size) {
      myArray.push(arr.slice(i, i + size));
    }
    return myArray;
  },

});
