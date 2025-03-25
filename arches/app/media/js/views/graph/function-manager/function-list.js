import ListView from 'views/list';

export default class FunctionList extends ListView {
    /**
    * A backbone view to manage a list of functions
    * @augments ListView
    * @constructor
    * @name FunctionList
    */
    filterFunction = null;

    /**
    * initializes the view with optional parameters
    * @memberof FunctionList.prototype
    * @param {object} options
    * @param {object} options.functions - a list of {@link FunctionModel} models
    */
    constructor(options) {
        super(options);
        this.items = options.functions;
        this.items.sort((left, right) => {
            const leftName = left.name().toLowerCase();
            const rightName = right.name().toLowerCase();
            return leftName === rightName ? 0 : (leftName < rightName ? -1 : 1);
        });
    }
}
