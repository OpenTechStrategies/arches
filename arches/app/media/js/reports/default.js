import ko from 'knockout';
import ReportViewModel from 'viewmodels/report';
import defaultTemplate from 'templates/views/report-templates/default.htm';

const viewModel = function (params) {
    params.configKeys = [];
    ReportViewModel.apply(this, [params]);
};

export default ko.components.register('default-report', {
    viewModel: viewModel,
    template: defaultTemplate
});
