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
    this.etaItems = {};
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
    this.config.ETAs.map((eta) => {
      this.sendSocketNotification("ADD_ETA", {
        feed: eta,
        config: this.config
      });
    });
  },


  socketNotificationReceived: function (notification, payload) {
    if (notification === "ETA_ITEMS") {
      let data = {};
      for (const [stopID, stopInfo] of Object.entries(payload)) {
        const sortedETAs = stopInfo.etas.sort(function (a, b) {
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
        stopInfo.etas = sortedETAs;
        data[stopID] = stopInfo;
      }
      this.etaItems = data;
      this.updateDom();
    }
  },

  getDom: function () {
    let wrapper = document.createElement("div");
    for (const [stopID, stopInfo] of Object.entries(this.etaItems)) {
      if (this.activeItem >= stopInfo.etas.length) {
        this.activeItem = 0;
      }

      // Actually it is a new redraw
      if (stopInfo === null) {
        wrapper.innerHTML = this.translate("LOADING");
        wrapper.className = "small dimmed";
        return wrapper;
      }

      let header = document.createElement("header");
      header.innerHTML = (stopInfo.stopInfo != null) ? stopInfo.stopInfo.CName : this.config.stopName;
      wrapper.appendChild(header);

      // Start creating connections table
      let table = document.createElement("table");
      table.classList.add("small", "table");
      table.border = '0';

      table.appendChild(this.createLabelRow());

      table.appendChild(this.createSpacerRow());

      let nonActiveRoute = [];
      let activeRoute = [];

      [nonActiveRoute, activeRoute] = this.partition(stopInfo.etas, (e) => e.hasOwnProperty('eta') && this.containsAny(e.eta.eta[0].t, NOBUSINDICATORLIST));

      activeRoute.map((etaObj) => {
        data = this.createDataRow(etaObj);
        if (data != null)
          table.appendChild(data);
      });

      if (this.config.inactiveRouteCountPerRow != 0 && nonActiveRoute > 0) {
        table.appendChild(this.createSpacerRow());
        table.appendChild(this.createNonActiveRouteRow(nonActiveRoute));
      }

      wrapper.appendChild(table);
    }

    return wrapper;
  },

  partition: function (array, isValid) {
    return array.reduce(([pass, fail], elem) => {
      return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]];
    }, [[], []]);
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
    line.innerHTML = routeObj.stopInfo.Route;
    row.appendChild(line);

    let destination = document.createElement("td");
    destination.className = "destination";
    destination.innerHTML = routeObj.stopInfo.basicInfo.DestCName;
    row.appendChild(destination);

    etaInfo = routeObj;
    if (etaInfo.hasOwnProperty('eta')) {
      let departure = document.createElement("td");
      departure.className = "departure";
      etaArray = [];
      etaInfo.eta.eta.map((etaInfoItem) => {
        const etaStr = etaInfoItem.t;
        const eta = this.replaceAll(etaStr, BUSLINELOOKUP).replace(/\s/g, '');
        etaArray.push(eta);
      });
      departure.innerHTML = etaArray.toString();
      row.appendChild(departure);
    }
    return row;
  },

  replaceAll: (str, mapObj) => {
    const re = new RegExp(Object.keys(mapObj).join("|"), "gi");

    return str.replace(re, function (matched) {
      return mapObj[matched.toLowerCase()];
    });
  },

  containsAny: function (str, items) {
    for (let i in items) {
      let item = items[i];
      if (str.indexOf(item) > -1) {
        return true;
      }
    }
    return false;
  },

  chunkArrayInGroups: function (arr, size) {
    let myArray = [];
    for (let i = 0; i < arr.length; i += size) {
      myArray.push(arr.slice(i, i + size));
    }
    return myArray;
  },

});
