import arches from 'arches';
import Backbone from 'backbone';
import dropzone from 'dropzone';
import Cookies from 'js-cookie';
import 'bootstrap';

export default class AddImageForm extends Backbone.View {
    events = {
        'click button': 'close'
    };

    initialize(options) {
        const self = this;
        const dropzoneEl = this.$el.find('.dropzone');
        let dropzoneInstance;
        if (!dropzoneEl.hasClass('dz-clickable')) {
            dropzoneInstance = new dropzone(dropzoneEl[0], {
                url: arches.urls.concept.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', this.model.get('id')),
                acceptedFiles: 'image/*',
                headers: {
                    'X-CSRFToken': Cookies.get('csrftoken')
                }
            });
            dropzoneInstance.on("addedfile", function (file) {
                self.changed = true;
            });
        }
        this.$el.find('.modal').modal('show');
    }

    close() {
        const self = this;
        const modal = this.$el.find('.modal');
        if (this.changed) {
            modal.on('hidden.bs.modal', function () {
                self.trigger('dataChanged');
            });
        }
        modal.modal('hide');
    }
}
