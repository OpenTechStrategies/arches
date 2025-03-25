import ko from 'knockout';
import _ from 'underscore';
import WidgetViewModel from 'viewmodels/widget';
import nonlocalizedTextWidgetTemplate from 'templates/views/components/widgets/non-localized-text.htm';

const viewModel = function (params) {
    params.configKeys = ['placeholder', 'width', 'maxLength', 'defaultValue', 'uneditable'];

    WidgetViewModel.apply(this, [params]);

    const self = this;

    this.disable = ko.computed(() => {
        return ko.unwrap(self.disabled) || ko.unwrap(self.uneditable);
    }, self);
};

export default ko.components.register('non-localized-text-widget', {
    viewModel: viewModel,
    template: nonlocalizedTextWidgetTemplate
});
