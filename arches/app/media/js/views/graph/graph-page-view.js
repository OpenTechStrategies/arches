import ko from 'knockout';
import _ from 'underscore';
import BaseManager from 'views/base-manager';
import data from 'views/graph/graph-base-data';
import 'bindings/chosen';

/**
* A backbone view representing a page in the graph manager workflow.  It
* adds some graph manager specfic values to the view model.
*
* @augments BaseManager
* @constructor
* @name GraphPageView
*/
export default class GraphPageView extends BaseManager {
    /**
    * Creates an instance of GraphPageView, optionally using a passed in
    * view model
    *
    * @memberof GraphPageView.prototype
    * @param {object} options
    * @param {object} options.viewModel - an optional view model to be
    *                 bound to the page
    * @return {object} an instance of GraphPageView
    */
    constructor(options) {
        options.viewModel.graphid = ko.observable(data.graphid);
        super(options);
        options.viewModel.graphid.subscribe((graphid) => {
            var re = /\b[a-f\d-]{36}\b/;
            var newPath = window.location.pathname.replace(re, graphid);
            this.viewModel.navigate(newPath);
        });
        return this;
    }
}
