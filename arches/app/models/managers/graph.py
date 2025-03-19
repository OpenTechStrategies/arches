import uuid
from django.utils.translation import gettext as _
from django.db import models


class GraphManager(models.Manager):
    def create(self, *args, **kwargs):
        raise NotImplementedError(
            _(
                "Use create_graph() to create new Graph instances with proper business logic."
            )
        )

    def create_graph(self, author="", name="", is_resource=False):
        from arches.app.models import models as arches_models

        """
        Create a new Graph and related objects, encapsulating all creation side effects.
        """
        new_id = uuid.uuid1()
        nodegroup = None

        graph_model = arches_models.GraphModel(
            name=name,
            subtitle="",
            author=author,
            description="",
            version="",
            isresource=is_resource,
            iconclass="",
            ontology=None,
            slug=None,
        )
        graph_model.save()  # to access `save` method declared on model

        if not is_resource:
            nodegroup = arches_models.NodeGroup.objects.create(pk=new_id)
            arches_models.CardModel.objects.create(
                nodegroup=nodegroup, name=name, graph=graph_model
            )

        # root node
        arches_models.Node.objects.create(
            pk=new_id,
            name=name,
            description="",
            istopnode=True,
            ontologyclass=None,
            datatype="semantic",
            nodegroup=nodegroup,
            graph=graph_model,
        )

        graph = self.get(pk=graph_model.graphid)

        graph.publish()
        graph.create_editable_future_graph()

        return graph
