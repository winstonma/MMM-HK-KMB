# MMM-HK-KMB
<B>Station monitor</B> for the <B>Hong Kong KMB</B>.<P>

This module is an extension of the amazing [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror) project by [MichMich](https://github.com/MichMich/) which has inspired me to share my coding skills with others as well. Check it out, you know you want to :). <P>

It's always nice to see mirrors using my work, so feel free to send me some screenshots of your implementations.<P>

Lastly, why not join in on our discussions at the official [MagicMirror<sup>2</sup> Forum](http://forum.magicmirror.builders/)?

## Reverse Engineering Process
I wrote an article on [Medium](https://medium.com/@winstonhyypia/the-making-of-mmm-hk-kmb-module-db6eb0181eb6) about the reverse engineering process. Hope you could enjoy.

## Screenshots

![MMM-HK-KMB module running in MagicMirror<sup>2</sup>](screenshots/screenshot_zh.png)

## Current version

v1.4.1

## Languages
As of version 1.0.0, MMM-HK-KMB features language support for `Chinese (zh)` and `English (en)` mirrors.

## Prerequisite
A working installation of [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)
 
## Dependencies
  * npm
  * [node-schedule](https://www.npmjs.com/package/node-schedule)
  * [got](https://www.npmjs.com/package/got)

## Installation
To add this module, go to MagicMirror folder and run the following command
```bash
cd modules
git clone https://github.com/winstonma/MMM-HK-KMB.git
cd MMM-HK-KMB
npm install
```

## Module behavior
Please note that this module auto-creates a module header which displays the name of the chosen Hong Kong local transport stop. It is therefore recommended not to add a 'header' entry to your config.js for this module.<P>
This module automatically disappears from your mirror as soon as a station has stopped offering connections at night. It reappears as soon as your chosen station is scheduled to be served again.<P>
This module has been programmed to allow for multiple instances. Simply add more MMM-HK-KMB config entries to your config.js file to display multiple stations and configure them according to your needs.

## Configuration
Sample minimum configuration entry for your `~/MagicMirror/config/config.js`:

    ...

    {
      module: 'MMM-HK-KMB',
      position: 'top_left',
      config: {
        stops: [
          {
            stopID: 'HO06-S-1250-0',		// Which stop would you like to have displayed?	
          }
        ]
      }
    } 						// If this isn't your last module, add a comma after the bracket
  
  ...

Sample configuration entry for your `~/MagicMirror/config/config.js` with optional parameters:

    ...

    {
      module: 'MMM-HK-KMB',
      position: 'top_left',
      config: {
        stops: [
          {
            stopID: 'HO06-S-1250-0',		// Which stop would you like to have displayed?	
          }
        ],
        inactiveRouteCountPerRow: 0,   // how many inactive route would be displayed, 0 means hide all inactive route
        labelRow: true, // Show or hide column headers
        reload: 60000 	// How often should the information be updated? (In milliseconds)
      }
    } 						// If this isn't your last module, add a comma after the bracket

    ...

## Find the `stopID`
1. Open your web browser and navigate to the [USHB KMB Search Page](https://search.ushb.net/bus/KMB).
2. Enter the KMB Bus route number that passes the stop. Then the route info would be displayed.
3. At the top of the page, pick the desired `路線方向`
4. Go to the bus stop list and click on your bus stop
5. At the map, click on `車站資料`. A new page would be displayed.
6. When a new page is being displayed, check the link (e.g. https://search.ushb.net/bus/stop/TS26-T-1000-0). Note the last portion of the link (e.g. HO06-S-1250-0)is the `StopID` you are looking for.

## Config Options
| **Option** | **Default** | **Description** |
| :---: | :---: | --- |
| stopID | HO06-S-1250-0 | <BR>Which stop would you like to have displayed? <BR><EM> Default: HO06-S-1250-0</EM><P> |
| labelRow<BR>`optional` | true | <BR> Show or hide column headers<BR> <EM>Possible values: true, false</EM><P> |
| reload<BR>`optional`  | 60000 | <BR> How often should the information be updated? (In milliseconds) <BR><EM> Default: Every minute </EM><P> |

## Licence
MIT License

Copyright (c) 2016 Winston (https://github.com/winstonma/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
