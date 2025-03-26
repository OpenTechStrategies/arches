import $ from 'jquery';
import _ from 'underscore';
import DomainWidgetViewModel from 'viewmodels/domain-widget';

const RemoteDomainWidgetViewModel = function (params) {
    var self = this;

    params.configKeys = _.union(['options', 'url'], params.configKeys);

    DomainWidgetViewModel.apply(this, [params]);

    var prepData = typeof params.prepData === 'function' ?
        params.prepData :
        function (data) { return data; };

    var getOptions = function (url) {
        if (url) {
            $.ajax({
                url: url,
                dataType: 'json'
            }).done(function (data) {
                self.options(prepData(data));
            });
        }
    };

    this.url.subscribe(getOptions);
    getOptions(this.url());
};

export default RemoteDomainWidgetViewModel;
