import BaseManagerView from 'views/base-manager';
import 'bindings/datatable';

class EditHistory extends BaseManagerView {
    initialize(options) {
        options.viewModel.resourceTableConfig = {
            "responsive": true,
            "paging": true,
            "scrollY": "50vh",
            "scrollCollapse": true,
            "language": {
                "paginate": {
                    "previous": '<i class="fa fa-angle-left"></i>',
                    "next": '<i class="fa fa-angle-right"></i>'
                }
            },
            "order": [[3, "desc"]],
            "columns": [
                null,
                null,
                null,
                { "orderData": 7 },
                null,
                null,
                null,
                { "visible": false }
            ]
        };
        super.initialize(options);
    }
}

export default new EditHistory();
