import _ from 'underscore';
import BaseManagerView from 'views/base-manager';
import 'views/components/resource-report-abstract';

class View extends BaseManagerView {
    initialize(options) {
        super.initialize(options);
        if (location.search.indexOf('print') > 0) {
            const self = this;
            self.viewModel.loading(true);
            setTimeout(function () {
                self.viewModel.loading(false);
                window.print();
            }, 7000 // a generous timeout here to allow maps/images to load
            );
        }
    }
}

export default new View();
