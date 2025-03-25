import _ from 'underscore';
import ko from 'knockout';
import workbenchTemplate from 'templates/views/components/workbench.htm';
import ariaUtils from 'utils/aria';
import 'bindings/sortable';

class Workbench {
    constructor(params) {
        this.activeTab = ko.observable(params.activeTab);
        this.showTabs = ko.observable(true);
        this.hideSidePanel = (focusElement) => {
            this.activeTab(undefined);
            if (focusElement) {
                ariaUtils.shiftFocus(focusElement);
            }
        };

        if (this.card) {
            this.card.allowProvisionalEditRerender(false);
        }

        this.expandSidePanel = ko.computed(() => {
            if (this.tile) {
                return this.tile.hasprovisionaledits() && this.reviewer === true;
            } else {
                return false;
            }
        });

        this.workbenchWrapperClass = ko.observable();

        this.toggleTab = (tabName) => {
            if (this.activeTab() === tabName) {
                this.activeTab(null);
            } else {
                this.activeTab(tabName);
            }
        };
    }
}

ko.components.register('workbench', {
    viewModel: Workbench,
    template: workbenchTemplate,
});

export default Workbench;
