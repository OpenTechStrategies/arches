define([
    'jquery',
    'underscore',
    'views/components/search/base-filter',
    'knockout',
    'templates/views/components/search/sort-results.htm',
    'chosen',
], function($, _, BaseFilter, ko, sortResultsTemplate) {
    const viewModel = BaseFilter.extend({
        initialize: function(options) {
            options.name = 'Sort Results';
            BaseFilter.prototype.initialize.call(this, options);

            this.sortBy = ko.observable('');
            this.sortOrder = ko.observable('');
            
            this.sortSymbol=ko.computed(function() {
                return this.sortOrder() === "asc" ? 
                    '<i class="fa fa-sort-alpha-asc fa-lg"></i>' :  
                    '<i class="fa fa-sort-alpha-desc fa-lg"></i>'
            }, this);

            this.searchFilterVms['sort-results'](this); 
            
            this.sortBy.subscribe(function(){
                this.updateQuery();
            }, this);

            this.sortOrder.subscribe(function(){
                this.updateQuery();
            }, this);

            this.restoreState();

        },

        updateQuery: function() {
            var queryObj = this.query();

            if(this.sortBy() === '') {
                delete queryObj['sort-by'];
            } else {
                queryObj['sort-by'] = this.sortBy();
            }

            if(this.sortOrder() === '') {
                delete queryObj['sort-order'];
            } else {
                queryObj['sort-order'] = this.sortOrder();
            }

            this.query(queryObj);
        },

        restoreState: function(){
            var query = this.query();

            if ('sort-by' in query) {
                this.sortBy(query['sort-by']);
            }

            if ('sort-order' in query) {
                this.sortOrder(query['sort-order']);
            }
        },

        clear: function(){
            this.sortBy('');
            this.sortOrder('')
        }
        
    });

    return ko.components.register('sort-results', {
        viewModel: viewModel,
        template: sortResultsTemplate,
    });
});