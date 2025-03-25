import _ from 'underscore';
import ko from 'knockout';
import arches from 'arches';
import BaseManagerView from 'views/base-manager';
import 'bindings/chosen';

class ResourceView extends BaseManagerView {
    initialize(options) {
        var self = this;
        _.defaults(this.viewModel, {
            showFind: ko.observable(false),
            graphId: ko.observable(null),
            arches: arches,
        });
        this.viewModel.graphId.subscribe(function(graphid) {
            if(graphid && graphid !== ""){
                self.viewModel.navigate(arches.urls.add_resource(graphid));
            }
        });
        super.initialize(options);
    }
}

export default new ResourceView();
