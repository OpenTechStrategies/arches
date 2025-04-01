from django.utils.translation import gettext as _

from arches.app.models import models
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.utils.permission_backend import user_is_resource_editor
from arches.app.utils.response import JSONErrorResponse, JSONResponse
from arches.app.views.api import APIBase


class UserIncompleteWorkflows(APIBase):
    def get(self, request):
        if not user_is_resource_editor(request.user):
            return JSONErrorResponse(
                _("Request Failed"), _("Permission Denied"), status=403
            )

        if request.user.is_superuser:
            incomplete_workflows = (
                models.WorkflowHistory.objects.filter(completed=False)
                .exclude(componentdata__iexact="{}")
                .order_by("created")
            )
        else:
            incomplete_workflows = (
                models.WorkflowHistory.objects.filter(
                    user=request.user, completed=False
                )
                .exclude(componentdata__iexact="{}")
                .order_by("created")
            )

        incomplete_workflows_user_ids = [
            incomplete_workflow.user_id for incomplete_workflow in incomplete_workflows
        ]

        incomplete_workflows_users = models.User.objects.filter(
            pk__in=set(incomplete_workflows_user_ids)
        )

        user_ids_to_usernames = {
            incomplete_workflows_user.pk: incomplete_workflows_user.username
            for incomplete_workflows_user in incomplete_workflows_users
        }

        plugins = models.Plugin.objects.all()

        workflow_slug_to_workflow_name = {
            plugin.componentname: plugin.name for plugin in plugins
        }

        incomplete_workflows_json = JSONDeserializer().deserialize(
            JSONSerializer().serialize(incomplete_workflows)
        )

        for incomplete_workflow in incomplete_workflows_json:
            incomplete_workflow["username"] = user_ids_to_usernames[
                incomplete_workflow["user_id"]
            ]
            incomplete_workflow["pluginname"] = workflow_slug_to_workflow_name[
                incomplete_workflow["workflowname"]
            ]

        return JSONResponse(
            {
                "incomplete_workflows": incomplete_workflows_json,
                "requesting_user_is_superuser": request.user.is_superuser,
            }
        )
