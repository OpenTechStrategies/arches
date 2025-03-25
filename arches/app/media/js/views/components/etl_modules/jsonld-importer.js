import _ from 'underscore';
import ko from 'knockout';
import JSONLDImportViewModel from 'viewmodels/jsonld-importer';
import JSONLDImporterTemplate from 'templates/views/components/etl_modules/jsonld-importer.htm';
import 'dropzone';
import 'bindings/select2-query';
import 'bindings/dropzone';

export default ko.components.register('jsonld-importer', {
    viewModel: JSONLDImportViewModel,
    template: JSONLDImporterTemplate,
});
