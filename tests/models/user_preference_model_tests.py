"""
ARCHES - a program developed to inventory and manage immovable cultural heritage.
Copyright (C) 2013 J. Paul Getty Trust and World Monuments Fund

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
"""

import uuid
from tests.base_test import ArchesTestCase
from arches.app.models import models
from arches.app.models.models import UserPreference

# these tests can be run from the command line via
# python manage.py test tests.models.user_preference_model_tests --settings="tests.test_settings"


class UserPreferenceTests(ArchesTestCase):
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

    def test_user_preference_passes(self):
        user_pref = self.generate_user_preference()
        user_pref.save()
        self.assertTrue(
            UserPreference.objects.filter(
                userpreferenceid=user_pref.userpreferenceid
            ).exists()
        )

    def test_user_preference_invalid_user(self):
        user_pref = self.generate_user_preference()

        with self.assertRaises(Exception):
            user_pref.user = "admin"
            user_pref.save()
