import ko from 'knockout';
import { hexGrid } from 'turf';
import arches from 'arches';
import _ from 'underscore';

export default function (searchAggregations) {
    var cellWidth = arches.hexBinSize;
    var units = 'kilometers';
    var fooHexGrid = hexGrid(arches.hexBinBounds, cellWidth, units);
    _.each(fooHexGrid.features, function (feature, i) {
        feature.properties.id = i;
    });
    return ko.observable(fooHexGrid);
};
