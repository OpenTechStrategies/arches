import json
import os, uuid
from django.test import TransactionTestCase
from django.urls import reverse
from django.test.utils import captured_stdout
from django.core import management
from arches.app.models.models import UserPreference
from arches.app.models.system_settings import settings
from arches.app.models import models
from tests import test_settings
from django.test.client import Client


# these tests can be run from the command line via
# python manage.py test tests.views.user_preference_api_tests --settings="tests.test_settings"


class UserPrefApiTest(TransactionTestCase):
    def generate_user_preference(self):
        user_preference = UserPreference()
        user_preference.userpreferenceid = uuid.uuid4()
        user_preference.user = models.User.objects.get(username="admin")
        user_preference.preferencename = "test preference"
        user_preference.config = [
            {"overlayid": "7d0dffba-5bcf-4694-a5d7-3425ad97fa2b", "sortorder": 1},
            {"overlayid": "85c0cdd4-95d0-4350-bd9d-729f326fe1d5", "sortorder": 2},
        ]
        return user_preference

    def test_user_preference_api(self):
        # Test POST
        user_pref = {
            "userpreferenceid": None,
            "user": models.User.objects.get(username="admin"),
            "preferencename": "test preference",
            "config": [
                {"overlayid": "7d0dffba-5bcf-4694-a5d7-3425ad97fa2b", "sortorder": 1},
                {"overlayid": "85c0cdd4-95d0-4350-bd9d-729f326fe1d5", "sortorder": 2},
            ],
        }

        self.client.login(username="admin", password="admin")
        response = self.client.post(
            reverse("api_user_preference", kwargs={"identifier": ""}),
            data=user_pref,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        response_json = json.loads(response.content)

        response = self.client.get(
            reverse("api_user_preference", kwargs={"identifier": ""}),
        )
        print(response.content)
        # if user_pref.userpreferenceid in response_json.keys():
