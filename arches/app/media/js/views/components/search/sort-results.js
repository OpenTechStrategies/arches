const { filter } = require("underscore");

define([
    'jquery',
    'underscore',
    'views/components/search/base-filter',
    'knockout',
    'templates/views/components/search/sort-results.htm',
    'chosen',
], function($, _, BaseFilter, ko, sortResultsTemplate) {
    var componentName = 'sort-results';
    const viewModel = BaseFilter.extend({
        initialize: function(options) {
            options.name = 'Sort Results';
            BaseFilter.prototype.initialize.call(this, options);

            this.filterx = ko.observable('');
            this.order = ko.observable('');

            this.combinedFilterOrder = ko.computed(() => {
                return this.filterx() + "-" + this.order()
            });

            this.searchFilterVms[componentName](this);
            
            this.filterx.subscribe(function(){
                this.updateQuery();
            }, this);

            this.order.subscribe(function(){
                this.updateQuery();
            }, this);

            this.restoreState();
        },

        updateQuery: function() {
            var queryObj = this.query();
            if(this.filterx() === '' && this.order() === '') {
                delete queryObj[componentName];
            } else {
                queryObj[componentName] = this.combinedFilterOrder();
            }
            this.query(queryObj);
        },

        restoreState: function(){
            var query = this.query();
            if (componentName in query) {
                this.filterx(query[componentName].split("-")[0]);
            }
        },

        clear: function(){
            this.combinedFilterOrder({});
        }
        
    });

    return ko.components.register(componentName, {
        viewModel: viewModel,
        template: sortResultsTemplate,
    });
});
