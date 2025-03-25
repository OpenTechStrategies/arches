import $ from 'jquery';
import _ from 'underscore';
import ko from 'knockout';
import FunctionViewModel from 'viewmodels/function';
import 'bindings/chosen';
import nodegroupSelectorTemplate from 'templates/views/components/nodegroup-selector.htm';

class NodegroupSelector extends FunctionViewModel {
    constructor(params) {
        super(params);
        const nodegroups = {};
        this.cards = ko.observableArray();

        this.graph.cards.forEach(card => {
            const found = !!_.find(this.graph.nodegroups, nodegroup => {
                return nodegroup.parentnodegroup_id === card.nodegroup_id;
            });
            if (!found && !(card.nodegroup_id in nodegroups)) {
                this.cards.push(card);
                nodegroups[card.nodegroup_id] = true;
            }
        });

        this.triggering_nodegroups = params.triggering_nodegroups;
        setTimeout(() => {
            $("select[data-bind^=chosen]").trigger("chosen:updated");
        }, 300);
    }
}

ko.components.register('views/components/nodegroup-selector', {
    viewModel: NodegroupSelector,
    template: nodegroupSelectorTemplate,
});

export default NodegroupSelector;
