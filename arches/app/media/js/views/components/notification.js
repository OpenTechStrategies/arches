import $ from 'jquery';
import ko from 'knockout';
import moment from 'moment';
import arches from 'arches';
import notificationTemplate from 'templates/views/components/notification.htm';

/** 
 * A generic component for displaying notifications
 * @name NotificationViewModel
 **/

class NotificationViewModel {
    constructor(params) {
        this.info = ko.observable();

        this.displaytime = moment(params.created).format('dddd, DD MMMM YYYY | hh:mm A');
        this.id = params.id;
        this.loadedResources = params.loaded_resources;
        this.link = params.link;
        this.message = params.message;
        this.files = params.files;
        this.translations = arches.translations;
    }

    dismiss(parent) {
        $.ajax({
            type: 'POST',
            url: arches.urls.dismiss_notifications,
            data: { "dismissals": JSON.stringify([this.id]) },
        }).done(() => {
            if (parent) {
                const item = parent.items().find(item => item.id === this.id);
                parent.items.remove(item);
            }
        });
    }

    getExportFile() {
        $.ajax({
            type: 'GET',
            url: arches.urls.get_export_file,
            data: { "exportid": this.link }
        }).done(data => {
            if (data.url) {
                window.open(data.url);
            } else {
                this.info(data.message);
            }
        });
    }
}

ko.components.register('notification', {
    viewModel: NotificationViewModel,
    template: notificationTemplate,
});

export default NotificationViewModel;
