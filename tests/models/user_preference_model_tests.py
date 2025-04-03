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
from django.test import TransactionTestCase
from tests.base_test import ArchesTestCase
from arches.app.models import models
from arches.app.models.models import UserPreference
from django.db import transaction, IntegrityError

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

    def test_user_preference_invalid_user(self):
        user_pref = self.generate_user_preference()

        with self.assertRaises(ValueError):
            user_pref.user = "admin"
            user_pref.save()

    def test_unique_constraint(self):
        # User preference number 1 (valid and no errors)
        user_pref_one = self.generate_user_preference()
        user_pref_one.save()

        # exact duplicate of preference name - fail constraint
        user_pref_two = self.generate_user_preference()
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                user_pref_two.save()

        # same preference name in different case - also fail constraint
        user_pref_three = self.generate_user_preference()
        user_pref_three.preferencename = "TEST PREFERENCE"
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                user_pref_three.save()
