import ListView from 'views/list';

export default class AppliedFunctionList extends ListView {
    /**
    * A backbone view to manage a list of functions
    * @augments ListView
    * @constructor
    * @name AppliedFunctionList
    */
    filterFunction = null;

    /**
    * initializes the view with optional parameters
    * @memberof AppliedFunctionList.prototype
    * @param {object} options
    */
    constructor(options) {
        super(options);
        this.items = options.functions;
        this.items.sort((left, right) => {
            const leftName = left.function.name().toLowerCase();
            const rightName = right.function.name().toLowerCase();
            return leftName === rightName ? 0 : (leftName < rightName ? -1 : 1);
        });
    }
}
