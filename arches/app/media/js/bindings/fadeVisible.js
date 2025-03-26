import $ from 'jquery';
import ko from 'knockout';

ko.bindingHandlers.fadeVisible = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContent) {
        // Initially set the element to be instantly visible/hidden depending on the value
        var value = valueAccessor();
        $(element).toggle(ko.unwrap(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContent) {
        // Whenever the value subsequently changes, slowly fade the element in or out
        var delay = allBindingsAccessor.get('delay');
        var fade = allBindingsAccessor.get('fade');
        var value = valueAccessor();
        if (ko.unwrap(value) === false) {
            $(element).fadeOut(fade);
        } else {
            $(element).delay(delay).fadeIn(fade);
        }
    }
};

export default ko.bindingHandlers.fadeVisible;
