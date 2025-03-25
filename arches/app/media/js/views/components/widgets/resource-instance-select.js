import ko from 'knockout';
import resourceInstanceSelectWidgetTemplate from 'templates/views/components/widgets/resource-instance-select.htm';
import 'bindings/select2-query';
import ResourceInstanceSelectViewModel from 'viewmodels/resource-instance-select';

const viewModel = function (params) {
    params.multiple = false;
    params.datatype = 'resource-instance';
    ResourceInstanceSelectViewModel.apply(this, [params]);
};

ko.components.register('resource-instance-select-widget', {
    viewModel: viewModel,
    template: resourceInstanceSelectWidgetTemplate,
});

export default viewModel;
