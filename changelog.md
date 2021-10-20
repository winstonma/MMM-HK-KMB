# MMM-HK-KMB changelog
This module adheres to Winston

## [1.6.0] - 2021-10-20
* Revert the multiple stops support (This module makes more sense if it only support one stop).  Please remove the update the ```stops``` array settings inside ```config.js```. For more information please read the ```Configuration``` section inside [README.md](https://github.com/winstonma/MMM-HK-KMB/blob/master/README.md)

## [1.5.2] - 2020-11-04
* US Election Day release
* Removed [hkscs_unicode_converter](https://github.com/chaklim/hkscs_unicode_converter) as Hong Kong character is handled in [js-kmb-api](https://github.com/miklcct/js-kmb-api)

## [1.5.1] - 2020-11-01
* Use [hkscs_unicode_converter](https://github.com/chaklim/hkscs_unicode_converter) to fix the Hong Kong character problem
* Fix the hideInactiveRoute logic

## [1.5.0] - 2020-10-30
* Use [js-kmb-api](https://github.com/miklcct/js-kmb-api) as fetcher
* Minor config and bug fixes

## [1.4.2] - 2020-08-30
* Reverted the bus stop fetcher performance
* Merge new config from [kmb-lwb-combined-headway-eta](https://github.com/miklcct/kmb-lwb-combined-headway-eta)
* Natively support ```zh-tw```, ```zh-cn``` and ```en```

## [1.4.1] - 2020-08-24
* Improve the bus stop fetcher performance
* The bus stop name is now fetched from the bus route

## [1.4.0] - 2020-08-24
* Uses [kmb-lwb-combined-headway-eta](https://github.com/miklcct/kmb-lwb-combined-headway-eta) script to fetch the KMB related info

## [1.3.0] - 2020-08-18
* Use new ETA fetching method

## [1.2.0] - 2020-06-14
* Support multiple stops

## [1.1.2] - 2020-05-12
* Replace request package with got

## [1.1.1] - 2020-05-11
* Fix the route matching algorithum

## [1.1.0] - 2020-05-10
* Fix the route not showing
* Add the ability to hide the inactive route

## [1.0.0] - 2017-03-24 
* Initial release