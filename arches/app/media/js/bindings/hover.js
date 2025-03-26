import ko from 'knockout';

ko.bindingHandlers.hover = {
    init: function (element, valueAccessor) {
        var value = valueAccessor();
        ko.applyBindingsToNode(element, {
            event: {
                mouseenter: function () { value(true); },
                mouseleave: function () { value(false); }
            }
        });
    }
};

export default ko.bindingHandlers.hover;
