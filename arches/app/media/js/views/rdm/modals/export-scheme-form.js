import $ from 'jquery';
import Backbone from 'backbone';
import arches from 'arches';

export default class ExportSchemeForm extends Backbone.View {
    initialize(e) {
        if (!this.rendered) {
            this.render();
        }
    }

    render() {
        const self = this;
        this.rendered = true;
        this.modal = this.$el.find('.modal');
        if (!this.$el.find('.select2').attr('id')) {
            this.schemedropdown = this.$el.find('.select2').select2({
                placeholder: arches.translations.selectAnOption
            });
        }
        this.modal.validate({
            ignore: null,
            rules: {
                scheme_dd: "required"
            },
            submitHandler: function (form) {
                const scheme = $(form).find("[name=scheme_dd]").val();
                window.open(arches.urls.export_concept.replace('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', scheme), '_blank');
                self.modal.modal('hide');
            }
        });
    }
}
