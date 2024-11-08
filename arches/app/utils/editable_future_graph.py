from arches.app.models import models


def update_editable_future_nodegroups(editable_future_nodegroups):
    """
    Update the nodegroups in the source_graph to match those in the
    editable_future_graph.
    """

    def _update_source_nodegroup_hierarchy(nodegroup):
        if not nodegroup:
            return None

        node = models.Node.objects.get(pk=nodegroup.pk)
        if node.source_identifier_id:
            source_nodegroup = models.NodeGroup.objects.get(
                pk=node.source_identifier_id
            )

            source_nodegroup.cardinality = nodegroup.cardinality
            source_nodegroup.legacygroupid = nodegroup.legacygroupid

            if nodegroup.parentnodegroup_id:
                nodegroup_parent_node = models.Node.objects.get(
                    pk=nodegroup.parentnodegroup_id
                )

                if nodegroup_parent_node.source_identifier_id:
                    source_nodegroup.parentnodegroup_id = (
                        nodegroup_parent_node.source_identifier_id
                    )

            source_nodegroup.save()

        if nodegroup.parentnodegroup:
            _update_source_nodegroup_hierarchy(nodegroup=nodegroup.parentnodegroup)

    # creates `NodeGroup`s for source_nodegroups_nodes whose editable_future_node has been used to create a new card
    for editable_future_node in models.Node.objects.filter(
        nodegroup__in=editable_future_nodegroups
    ):
        if (
            editable_future_node.source_identifier
            and editable_future_node.pk == editable_future_node.nodegroup_id
            and editable_future_node.source_identifier.pk
            != editable_future_node.source_identifier.nodegroup_id
        ):
            models.NodeGroup.objects.create(
                nodegroupid=editable_future_node.source_identifier.pk,
                cardinality=editable_future_node.nodegroup.cardinality,
            )

    for editable_future_nodegroup in editable_future_nodegroups:
        _update_source_nodegroup_hierarchy(editable_future_nodegroup)
