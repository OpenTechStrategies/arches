import ko from 'knockout';
import $ from 'jquery';
import arches from 'arches';
import WidgetViewModel from 'viewmodels/widget';

const NAME_LOOKUP = {};

const ConceptSelectViewModel = function (params) {
    const self = this;

    params.configKeys = ['placeholder', 'defaultValue'];

    this.multiple = params.multiple || false;
    this.allowClear = params.allowClear ?? true;
    this.displayName = ko.observable('');

    WidgetViewModel.apply(this, [params]);

    this.valueList = ko.computed(function () {
        const valueList = self.value() || self.defaultValue();
        self.displayName();

        if (Array.isArray(valueList)) {
            return valueList;
        } else if (!self.multiple && valueList) {
            return [valueList];
        }
        return [];
    });

    this.valueObjects = ko.computed(function () {
        self.displayName();
        return self.valueList().map(function (value) {
            return {
                id: value,
                name: NAME_LOOKUP[value]
            };
        }).filter(function (item) {
            return item.name;
        });
    });

    this.displayValue = ko.computed(function () {
        const val = self.value();
        const name = self.displayName();
        return val ? name : null;
    });

    this.setNames = function () {
        const names = [];
        self.valueList().forEach(function (val) {
            if (ko.unwrap(val)) {
                if (NAME_LOOKUP[val]) {
                    names.push(NAME_LOOKUP[val]);
                    self.displayName(names.join(', '));
                } else {
                    $.ajax(arches.urls.get_pref_label + '?valueid=' + ko.unwrap(val), {
                        dataType: "json"
                    }).done(function (data) {
                        NAME_LOOKUP[val] = data.value;
                        names.push(data.value);
                        self.displayName(names.join(', '));
                    });
                }
            }
        });
    };
    this.setNames();

    this.value.subscribe(function () {
        self.setNames();
    });

    this.select2Config = {
        value: self.value,
        clickBubble: true,
        multiple: self.multiple,
        closeOnSelect: true,
        placeholder: self.placeholder,
        allowClear: self.allowClear,
        ajax: {
            url: arches.urls.paged_dropdown,
            dataType: 'json',
            quietMillis: 250,
            data: function (requestParams) {
                const term = requestParams.term || '';
                const page = requestParams.page || 1;
                return {
                    conceptid: ko.unwrap(params.node.config.rdmCollection),
                    query: term,
                    page: page,
                    lang: ko.unwrap(params.lang)
                };
            },
            processResults: function (data) {
                data.results.forEach(function (result) {
                    if (result.collector) {
                        delete result.id;
                    }
                });
                return {
                    results: data.results,
                    pagination: {
                        more: data.more
                    }
                };
            }
        },
        templateResult: function (item) {
            let indentation = '';
            for (let i = 0; i < item.depth - 1; i++) {
                indentation += '&nbsp;&nbsp;&nbsp;&nbsp;';
            }
            return indentation + item.text;
        },
        templateSelection: function (item) {
            return item.text;
        },
        escapeMarkup: function (m) { return m; },
        initComplete: false,
        initSelection: function (el, callback) {
            const valueList = self.valueList();

            const setSelectionData = function (data) {
                let valueData = [];

                if (self.multiple || Array.isArray(valueList)) {
                    if (!(data instanceof Array)) { data = [data]; }

                    valueData = data.map(function (valueId) {
                        return {
                            id: valueId,
                            text: NAME_LOOKUP[valueId],
                        };
                    });

                    valueList.forEach(function (value) {
                        if (value !== valueData[0].id) {
                            valueData.push({
                                id: value,
                                text: NAME_LOOKUP[value],
                            });
                        }
                    });

                    if (valueData[0].id !== valueList[0]) {
                        valueData.reverse();
                    }
                } else {
                    valueData = [{
                        id: data,
                        text: NAME_LOOKUP[data],
                    }];
                }

                if (!self.select2Config.initComplete) {
                    valueData.forEach(function (data) {
                        const option = new Option(data.text, data.id, true, true);
                        $(el).append(option);
                    });
                    self.select2Config.initComplete = true;
                }
                callback(valueData);
            };

            if (valueList.length > 0) {
                valueList.forEach(function (value) {
                    if (ko.unwrap(value)) {
                        if (NAME_LOOKUP[value]) {
                            setSelectionData(value);
                        } else {
                            $.ajax(arches.urls.concept_value + '?valueid=' + ko.unwrap(value), {
                                dataType: "json"
                            }).done(function (data) {
                                NAME_LOOKUP[value] = data.value;
                                setSelectionData(value);
                            });
                        }
                    }
                });
            } else {
                callback([]);
            }
        }
    };

    this.select2ConfigMulti = { ...this.select2Config };
    this.select2ConfigMulti.multiple = true;
};

export default ConceptSelectViewModel;
