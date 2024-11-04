import os
import shutil

from django.core.management.base import BaseCommand
from arches.app.models.system_settings import settings

from arches.app.models.system_settings import settings


class Command(BaseCommand):  # pragma: no cover
    """
    Command for migrating projects between versions

    """

    def handle(self, *args, **options):
        answer = input(
            "This operation will upgrade your project to version 8.0\n" "Continue? "
        )

        if answer.lower() in ["y", "yes"]:
            self.update_to_v8()
        else:
            self.stdout.write("Operation aborted.")

    def update_to_v8(self):
        # Removes unnecessary files
        self.stdout.write("Removing unnecessary files...")

        for file_to_delete in [
            ".frontend-configuration-settings.json",
            ".tsconfig-paths.json",
        ]:
            if os.path.exists(os.path.join(settings.APP_ROOT, "..", file_to_delete)):
                self.stdout.write("Deleting {}".format(file_to_delete))
                os.remove(os.path.join(settings.APP_ROOT, "..", file_to_delete))

        declarations_test_file_path = os.path.join(
            settings.APP_ROOT, "src", settings.APP_NAME, "declarations.test.ts"
        )

        if os.path.exists(declarations_test_file_path):
            self.stdout.write("Deleting {}".format("declarations.test.ts"))
            os.remove(declarations_test_file_path)

        self.stdout.write("Done!")

        # Updates webpack
        self.stdout.write("Creating updated webpack directory...")

        if os.path.isdir(os.path.join(settings.APP_ROOT, "..", "webpack")):
            shutil.rmtree(
                os.path.join(settings.APP_ROOT, "..", "webpack"), ignore_errors=True
            )

        shutil.copytree(
            os.path.join(settings.ROOT_DIR, "install", "arches-templates", "webpack"),
            os.path.join(settings.APP_ROOT, "..", "webpack"),
        )

        self.stdout.write("Done!")

        # Replaces tsconfig.json
        self.stdout.write("Updating tsconfig.json...")

        if os.path.exists(os.path.join(settings.APP_ROOT, "..", "tsconfig.json")):
            os.remove(os.path.join(settings.APP_ROOT, "..", "tsconfig.json"))

        shutil.copy2(
            os.path.join(
                settings.ROOT_DIR, "install", "arches-templates", "tsconfig.json"
            ),
            os.path.join(settings.APP_ROOT, "..", "tsconfig.json"),
        )

        # Replaces vitest config files
        self.stdout.write("Updating vitest configuration files...")

        for config_file in [
            "vitest.config.mts",
            "vitest.setup.mts",
        ]:
            self.stdout.write("Copying {} to project directory".format(config_file))
            shutil.copy2(
                os.path.join(
                    settings.ROOT_DIR, "install", "arches-templates", config_file
                ),
                os.path.join(settings.APP_ROOT, ".."),
            )

        self.stdout.write("Done!")

        # Update certain lines in GitHub Actions workflows.
        self.stdout.write("Updating GitHub Actions...")
        action_path = os.path.join(
            settings.APP_ROOT,
            "..",
            ".github",
            "actions",
            "build-and-test-branch",
            "action.yml",
        )
        if os.path.exists(action_path):
            first_find = "python manage.py check\n"
            first_replace = "python manage.py check --tag=compatibility\n"
            second_find = "python manage.py makemigrations --check\n"
            second_replace = "python manage.py makemigrations --check --skip-checks\n"
            with open(action_path, "r") as f:
                content = f.readlines()
            for i, line in enumerate(content):
                if line.endswith(first_find):
                    content[i] = line.replace(first_find, first_replace)
                elif line.endswith(second_find):
                    content[i] = line.replace(second_find, second_replace)
            with open(action_path, "w") as f:
                f.writelines(content)

        self.stdout.write("Done!")
