import json
import uuid
from tests.base_test import ArchesTestCase
from django.urls import reverse
from arches.app.models.models import UserPreference
from arches.app.models import models


# these tests can be run from the command line via
# python manage.py test tests.views.user_preference_api_tests --settings="tests.test_settings"


class UserPrefApiTest(ArchesTestCase):

    def user_preference_json_data(self, username):
        user_pref = {
            "userpreferenceid": None,
            "user": username,
            "preferencename": "test preference",
            "config": [
                {"overlayid": "7d0dffba-5bcf-4694-a5d7-3425ad97fa2b", "sortorder": 1},
                {"overlayid": "85c0cdd4-95d0-4350-bd9d-729f326fe1d5", "sortorder": 2},
            ],
        }
        return user_pref

    def test_user_preference_api(self):
        # Test POST as anonymous fails
        user_pref = self.user_preference_json_data("anonymous")
        with self.assertLogs("django.request", level="WARNING"):
            response = self.client.post(
                reverse("api_user_preference", kwargs={"identifier": ""}),
                data=user_pref,
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 403)

        # Test POST as admin
        self.client.login(username="admin", password="admin")

        user_pref = self.user_preference_json_data("admin")
        response = self.client.post(
            reverse("api_user_preference", kwargs={"identifier": ""}),
            data=user_pref,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        response_json = json.loads(response.content)
        self.assertTrue("userpreferenceid" in response_json.keys())
        admin_userpref_id = response_json["userpreferenceid"]

        # Add a second preference
        user_pref = self.user_preference_json_data("anonymous")
        response = self.client.post(
            reverse("api_user_preference", kwargs={"identifier": ""}),
            data=user_pref,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        response_json = json.loads(response.content)
        anonymous_userpref_id = response_json["userpreferenceid"]

        # Test with invalid user
        user_pref = self.user_preference_json_data("fakeuser")
        with self.assertLogs("django.request", level="WARNING"):
            response = self.client.post(
                reverse("api_user_preference", kwargs={"identifier": ""}),
                data=user_pref,
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 400)

        # Test GET as admin with no identifier
        response = self.client.get(
            reverse("api_user_preference", kwargs={"identifier": ""}),
        )
        self.assertEqual(response.status_code, 200)
        response_json = json.loads(response.content)
        self.assertTrue(isinstance(response_json, list))
        self.assertTrue(len(response_json) == 2)

        # Test GET as admin with both identifiers
        response = self.client.get(
            reverse("api_user_preference", kwargs={"identifier": admin_userpref_id}),
        )
        self.assertEqual(response.status_code, 200)
        response = self.client.get(
            reverse(
                "api_user_preference", kwargs={"identifier": anonymous_userpref_id}
            ),
        )
        self.assertEqual(response.status_code, 200)

        # Test GET that doesn't exist
        with self.assertLogs("django.request", level="WARNING"):
            response = self.client.get(
                reverse(
                    "api_user_preference", kwargs={"identifier": str(uuid.uuid4())}
                ),
            )
        self.assertEqual(response.status_code, 404)

        # Test GET as anonymous with no identifier
        self.client.force_login(models.User.objects.get(username="anonymous"))

        response = self.client.get(
            reverse("api_user_preference", kwargs={"identifier": ""}),
        )
        response_json = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(isinstance(response_json, list))
        self.assertTrue(len(response_json) == 1)  # ensure output is the one userpref

        # Test GET from anonymous with valid identifier
        response = self.client.get(
            reverse(
                "api_user_preference", kwargs={"identifier": anonymous_userpref_id}
            ),
        )
        self.assertEqual(response.status_code, 200)

        # Test GET from anonymous to user preference they don't have access to
        with self.assertLogs("django.request", level="WARNING"):
            response = self.client.get(
                reverse(
                    "api_user_preference", kwargs={"identifier": admin_userpref_id}
                ),
            )
        self.assertEqual(response.status_code, 403)

        # Test DELETE as anonymous fails
        with self.assertLogs("django.request", level="WARNING"):
            response = self.client.delete(
                reverse(
                    "api_user_preference", kwargs={"identifier": anonymous_userpref_id}
                ),
            )
        self.assertEqual(response.status_code, 403)

        # Test valid DELETE as admin
        self.client.login(username="admin", password="admin")
        response = self.client.delete(
            reverse(
                "api_user_preference", kwargs={"identifier": anonymous_userpref_id}
            ),
        )
        self.assertEqual(response.status_code, 204)

        # Test DELETE without identifier
        with self.assertLogs("django.request", level="WARNING"):
            response = self.client.delete(
                reverse("api_user_preference", kwargs={"identifier": ""}),
            )
        self.assertEqual(response.status_code, 400)

        # Test DELETE with invalid identifier
        with self.assertLogs("django.request", level="WARNING"):
            response = self.client.delete(
                reverse(
                    "api_user_preference", kwargs={"identifier": str(uuid.uuid4())}
                ),
            )
        self.assertEqual(response.status_code, 404)
