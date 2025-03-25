import ko from 'knockout';
import numberDatatypeTemplate from 'templates/views/components/datatypes/number.htm';

const name = 'number-datatype-config';
const viewModel = function (params) {
    const self = this;
    this.search = params.search;

    if (this.search) {
        const filter = params.filterValue();
        this.node = params.node;
        this.op = ko.observable(filter.op || 'eq');
        this.searchValue = ko.observable(filter.val || '');
        this.filterValue = ko.computed(function () {
            return {
                op: self.op(),
                val: self.searchValue()
            };
        }).extend({ throttle: 750 });
        params.filterValue(this.filterValue());
        this.filterValue.subscribe(function (val) {
            params.filterValue(val);
        });
    }
};

ko.components.register(name, {
    viewModel,
    template: numberDatatypeTemplate,
});

export default name;
