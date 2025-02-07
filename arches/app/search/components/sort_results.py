from arches.app.search.components.base import BaseSearchFilter
from django.utils.translation import get_language
from arches.app.models.models import SearchComponent

details = {
    "searchcomponentid": "6a2fe122-de54-4e44-8e93-b6a0cda7955c",
    "name": "Sort",
    "icon": "",
    "modulename": "sort_results.py",
    "classname": "SortResults",
    "type": "sort-results-type",
    "componentpath": "views/components/search/sort-results",
    "componentname": "sort-results",
    "config": {},
}

class SortResults(BaseSearchFilter):
    def append_dsl(self, search_query_object, **kwargs):
        sort_param = self.request.GET.get(self.componentname, None)

        sort_component = SearchComponent.objects.get(name="Sort")
        sort_config = sort_component.config

        sort_order, sort_by = sort_param.split("-")

        sort_field = "displayname.value"

        sort_dsl = {
            "nested": {
                "path": "displayname",
                        "filter": {"term": {"displayname.language": get_language()}},
            },
        }

        if sort_by and sort_config:
            sort_field = sort_config["field"]
            sort_dsl = sort_config["dsl"]       

        if sort_order is not None and sort_order != "":
            sort_dsl["order"] = sort_order

        search_query_object["query"].sort(
            field=sort_field,
            dsl=sort_dsl,
        )
