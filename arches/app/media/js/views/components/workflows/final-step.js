import ko from 'knockout';
import arches from 'arches';
import finalStepTemplate from 'templates/views/components/workflows/final-step.htm';

function FinalStep(params) {

    this.urls = arches.urls;
    this.loading = ko.observable(true);
    this.resourceid = params.resourceid;
    this.workflowUrl = `${this.urls.root}plugins/${params.pageVm.plugin.slug}`;
    this.resourceEditUrl = `${this.urls.resource}/${this.resourceid}`;

    try {
        this.resourceid = ko.unwrap(params.workflow.resourceId);
    } catch (e) {
        try {
            this.resourceid = ko.unwrap(params.form.resourceId);
        } catch (e) {
            // pass
        }
    }
}

ko.components.register('final-step', {
    viewModel: FinalStep,
    template: finalStepTemplate,
});

export default FinalStep;
