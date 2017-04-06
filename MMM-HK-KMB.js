/* Magic Mirror
 * Module: MMM-HK-KMB
 *
 * By Winston / https://github.com/winstonma
 * MIT Licensed.
 * 
 * v1.0.0
 */

Module.register("MMM-HK-KMB", {

    defaults: {
        reloadInterval:  1 * 60 * 1000, // every 1 minutes
        stopID: 'KA07-W-1000-0',
        lines: '',
        direction: '',
        labelRow: true,
        stopName: 'Stop',
        reload: 1 * 60 * 1000,       // every minute
    },

    getTranslations: function () {
        return {
            en: "translations/en.json",
            zh: "translations/zh.json"
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

        this.sendSocketNotification("ADD_STOP", {
                config: this.config
            });

        //this.registerETAs();
    },

    /* registerETAs()
     * registers the feeds to be used by the backend.
     */
    registerETAs: function() {
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
    subscribedToFeed: function(feedUrl) {
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
    titleForFeed: function(feedUrl) {
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
        header.innerHTML = this.config.stopName;
        wrapper.appendChild(header);

        // Start creating connections table
        var table = document.createElement("table");
        table.classList.add("small", "table");
        table.border='0';

        table.appendChild(this.createLabelRow());

        table.appendChild(this.createSpacerRow());

        for (t in this.etaItems) {
            var etaObj = this.etaItems[t];
            console.log(etaObj.stopInfo.BSICode);
            data = this.createDataRow(etaObj);
            if (!data)
                continue;
            table.appendChild(data);
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

        etaInfo = routeObj.data.response;
        if (etaInfo.length > 0) {
            var departure = document.createElement("td");
            departure.className = "departure";
            etaArray = [];
            for (r in etaInfo) {
                var etaStr = etaInfo[r].t;
                etaStr = etaStr.split('　')[0];
                etaArray.push(etaStr);
            }
            departure.innerHTML = etaArray.toString();
            row.appendChild(departure);
        }
        return row;
    }

});