import koMapping from 'knockout-mapping';
import arches from 'arches';

const ConstraintViewModel = function (params) {
    this.widgets = params.widgets || [];
    this.constraint = params.constraint;
    this.getSelect2ConstraintConfig = function (placeholder) {
        const nodeOptions = this.widgets.map(c => ({ text: c.label(), id: c.node.nodeid }));
        return {
            clickBubble: true,
            disabled: false,
            data: nodeOptions,
            value: this.constraint.nodes,
            multiple: params.multiple || true,
            closeOnSelect: false,
            placeholder: placeholder || arches.translations.cardConstraintsPlaceholder,
            allowClear: true
        };
    };
    this.update = function (val) {
        this.constraint.nodes(val.nodes);
        this.constraint.constraintid(val.constraintid);
        this.constraint.uniquetoallinstances(val.uniquetoallinstances);
    };
    this.toJSON = function () {
        return koMapping.toJS(this.constraint);
    };
};

export default ConstraintViewModel;
