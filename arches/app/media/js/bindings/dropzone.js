import $ from 'jquery';
import _ from 'underscore';
import ko from 'knockout';
import dropzone from 'dropzone';

/**
 * @constructor
 * @name dropzone
 */
ko.bindingHandlers.dropzone = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var innerBindingContext = bindingContext.extend(valueAccessor);
        ko.applyBindingsToDescendants(innerBindingContext, element);

        var options = valueAccessor() || {};

        _.each(_.filter(options, function (value, key) {
            return _.contains(['previewsContainer', 'clickable'], key);
        }), function (value, key) {
            options[key] = $(element).find(value)[0];
        });

        $(element).dropzone(options);
        return { controlsDescendantBindings: true };
    }
};

export default ko.bindingHandlers.dropzone;
