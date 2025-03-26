import $ from 'jquery';
import ko from 'knockout';
import arches from 'arches';

const makeFriendly = (ontologyName) => {
    ontologyName = ko.unwrap(ontologyName);
    if (ontologyName) {
        const parts = ontologyName.split('/');
        return parts[parts.length - 1];
    }
    return '';
};

const getSelect2ConfigForOntologyProperties = (value, domain, range, placeholder, allowClear = false) => {
    return {
        value,
        clickBubble: false,
        placeholder,
        closeOnSelect: true,
        allowClear,
        ajax: {
            url: arches.urls.ontology_properties,
            data: function () {
                return {
                    domain_ontology_class: domain,
                    range_ontology_class: range,
                    ontologyid: ''
                };
            },
            dataType: 'json',
            quietMillis: 250,
            processResults: function (data, params) {
                let filtered = data;
                if (params.term && params.term !== '') {
                    filtered = data.filter(item =>
                        item.toUpperCase().includes(params.term.toUpperCase())
                    );
                }
                return {
                    results: filtered.map(item => ({ id: item, text: item }))
                };
            }
        },
        templateResult: item => makeFriendly(item.text),
        templateSelection: item => makeFriendly(item.text),
        initSelection: function (el, callback) {
            if (value()) {
                const data = { id: value(), text: value() };
                const option = new Option(data.text, data.id, true, true);
                $(el).append(option);
                callback([data]);
            } else {
                callback([]);
            }
        }
    };
};

export default {
    makeFriendly,
    getSelect2ConfigForOntologyProperties
};
