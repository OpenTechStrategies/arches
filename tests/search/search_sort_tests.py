from django.contrib.auth.models import User
from django.test import TestCase, RequestFactory
from django.core import management
from arches.app.models import models
from arches.app.models.graph import Graph
from arches.app.models.resource import Resource
from arches.app.models.tile import Tile
from arches.app.views.search import search_results
from tests import test_settings
import os
import time
import json


class SearchSortTests(TestCase):

    @classmethod
    def setUpTestData(cls):

        cls.url = "/en/search?paging-filter=1&tiles=true&format=tilecsv&reportlink=false&precision=6&total=5&exportsystemvalues=false"
        cls.user = User.objects.get(username="admin")

        search_sort_test_model_path = os.path.join(
            test_settings.TEST_ROOT,
            "fixtures",
            "resource_graphs",
            "Search Sort Test Model.json",
        )

        management.call_command("es", operation="index_concepts")

        management.call_command(
            "packages",
            operation="import_graphs",
            source=search_sort_test_model_path,
            verbosity=0,
        )

        test_graph = Graph.objects.get(pk="cfc0d27d-b1f4-4939-a870-07d580be2b60")
        test_graph.publish(user=cls.user)

        Resource.objects.create(
            graph=test_graph,
            name="B Resource",
            resourceinstanceid="8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
        )

        Resource.objects.create(
            graph=test_graph,
            name="C Resource",
            resourceinstanceid="a94c81c5-2047-4b53-8341-495f12bfad95",
        )

        Resource.objects.create(
            graph=test_graph,
            name="A Resource",
            resourceinstanceid="09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
        )

        name_node_id = "322b3b82-0a39-11f0-a841-c3a65b371351"

        resource_a_name_tile = Tile.objects.create(
            **{
                "resourceinstance_id": "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
                "nodegroup_id": name_node_id,
            }
        )

        resource_a_name_tile.data = {
            "322b3b82-0a39-11f0-a841-c3a65b371351": {
                "en": {"value": "Resource A", "direction": "ltr"}
            }
        }
        resource_a_name_tile.save()

        resource_b_name_tile = Tile.objects.create(
            **{
                "resourceinstance_id": "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
                "nodegroup_id": name_node_id,
            }
        )

        resource_b_name_tile.data = {
            "322b3b82-0a39-11f0-a841-c3a65b371351": {
                "en": {"value": "Resource B", "direction": "ltr"}
            }
        }
        resource_b_name_tile.save()

        resource_c_name_tile = Tile.objects.create(
            **{
                "resourceinstance_id": "a94c81c5-2047-4b53-8341-495f12bfad95",
                "nodegroup_id": name_node_id,
            }
        )

        resource_c_name_tile.data = {
            "322b3b82-0a39-11f0-a841-c3a65b371351": {
                "en": {"value": "Resource C", "direction": "ltr"}
            }
        }
        resource_c_name_tile.save()

        # add delay to allow for indexes to be updated
        time.sleep(1)

    def search_request(self, query_params):
        factory = RequestFactory()
        url = f"{self.url}{query_params}"
        request = factory.get(url)
        request.user = self.user

        response = search_results(request)
        response_data = json.loads(response.content.decode("utf-8"))
        hits_data = response_data["results"]["hits"]["hits"]
        return [hit["_id"] for hit in hits_data]

    def test_sort_by_names_asc(self):
        hit_ids = self.search_request("&sort-by=resource_name&sort-order=asc")
        ids_ordered_by_name = [
            "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
            "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
            "a94c81c5-2047-4b53-8341-495f12bfad95",
        ]

        self.assertListEqual(
            hit_ids,
            ids_ordered_by_name,
            "The hits are not ordered by name as expected.",
        )

    def test_sort_by_names_desc(self):
        hit_ids = self.search_request("&sort-by=resource_name&sort-order=desc")
        ids_ordered_by_name = [
            "a94c81c5-2047-4b53-8341-495f12bfad95",
            "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
            "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
        ]

        self.assertListEqual(
            hit_ids,
            ids_ordered_by_name,
            "The hits are not ordered by name as expected.",
        )

    def test_sort_by_date_created_asc(self):
        hit_ids = self.search_request("&sort-by=date_created&sort-order=asc")
        ids_ordered_by_date_created = [
            "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
            "a94c81c5-2047-4b53-8341-495f12bfad95",
            "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
        ]

        self.assertListEqual(
            hit_ids,
            ids_ordered_by_date_created,
            "The hits are not ordered by date created",
        )

    def test_sort_by_date_created_desc(self):
        hit_ids = self.search_request("&sort-by=date_created&sort-order=desc")
        ids_ordered_by_date_created = [
            "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
            "a94c81c5-2047-4b53-8341-495f12bfad95",
            "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
        ]

        self.assertListEqual(
            hit_ids,
            ids_ordered_by_date_created,
            "The hits are not ordered by date created",
        )

    def test_sort_by_date_edited_asc(self):
        hit_ids = self.search_request("&sort-by=date_edited&sort-order=asc")
        ids_ordered_by_date_edited = [
            "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
            "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
            "a94c81c5-2047-4b53-8341-495f12bfad95",
        ]

        self.assertListEqual(
            hit_ids,
            ids_ordered_by_date_edited,
            "The hits are not ordered by date edited",
        )

    def test_sort_by_date_edited_desc(self):
        hit_ids = self.search_request("&sort-by=date_edited&sort-order=desc")
        ids_ordered_by_date_edited = [
            "a94c81c5-2047-4b53-8341-495f12bfad95",
            "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
            "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
        ]

        self.assertListEqual(
            hit_ids,
            ids_ordered_by_date_edited,
            "The hits are not ordered by date edited",
        )

    def test_sort_order_does_not_change_unsorted_data(self):
        unsorted_ids = self.search_request("")
        desc_sorted_ids = self.search_request("&sort-order=desc")

        self.assertListEqual(
            unsorted_ids, desc_sorted_ids, "The data has been unexpectedly ordered"
        )

    def test_sort_by_asc_if_order_not_specified(self):
        hit_ids = self.search_request("&sort-by=date_edited")
        ids_ordered_by_date_edited = [
            "09ba8b82-b6db-4ece-9a46-98f6d381a7b2",
            "8ec120f4-61cd-4fa1-8f9a-3d12cff3176f",
            "a94c81c5-2047-4b53-8341-495f12bfad95",
        ]

        self.assertListEqual(
            hit_ids,
            ids_ordered_by_date_edited,
            "The hits are not ordered by date edited ascending",
        )
