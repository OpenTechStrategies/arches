from arches.app.models import models


def update_nodegroups(current_graph, editable_future_graph, excluded_keys):
    """
    Update the nodegroups in the source_graph to match those in the editable_future_graph.
    """

    def _update_source_nodegroup_hierarchy(nodegroup):
        if not nodegroup:
            return None

        node = models.Node.objects.filter(pk=nodegroup.pk).first()
        source_nodegroup = None

        # updates source_nodegroup if node has a source_identifier_id
        if node and node.source_identifier_id:
            source_nodegroup = models.NodeGroup.objects.get(
                pk=node.source_identifier_id
            )
            for key, value in vars(nodegroup).items():
                if key not in excluded_keys:
                    setattr(source_nodegroup, key, value)

        # recursively update parent nodegroup relationships if parentnodegroup_id exists
        if nodegroup.parentnodegroup_id:
            parent_node = models.Node.objects.filter(
                pk=nodegroup.parentnodegroup_id
            ).first()
            if parent_node and parent_node.source_identifier_id:
                if source_nodegroup:
                    source_nodegroup.parentnodegroup_id = (
                        parent_node.source_identifier_id
                    )
                    source_nodegroup.save()

                nodegroup.parentnodegroup_id = parent_node.source_identifier_id
                nodegroup.save()

            _update_source_nodegroup_hierarchy(nodegroup=nodegroup.parentnodegroup)

    editable_future_nodegroups = editable_future_graph.get_nodegroups(
        force_recalculation=True
    )

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


def update_nodes(current_graph, editable_future_graph, excluded_keys):
    previous_node_ids = {str(node.pk) for node in current_graph.nodes.values()}
    current_graph.nodes = {}

    for future_node in list(editable_future_graph.nodes.values()):
        future_node_nodegroup_node = (
            models.Node.objects.get(pk=future_node.nodegroup.pk)
            if future_node.nodegroup
            else None
        )

        if future_node.source_identifier:
            source_node = future_node.source_identifier

            for key in vars(source_node).keys():
                if key not in excluded_keys:
                    setattr(source_node, key, getattr(future_node, key))

            source_node.nodegroup_id = future_node.nodegroup_id
            if (
                future_node_nodegroup_node
                and future_node_nodegroup_node.source_identifier_id
            ):
                source_node.nodegroup_id = (
                    future_node_nodegroup_node.source_identifier_id
                )

            current_graph.nodes[source_node.pk] = source_node
        else:
            future_node.graph_id = current_graph.pk
            future_node.source_identifier_id = None

            if (
                future_node_nodegroup_node
                and future_node_nodegroup_node.source_identifier_id
            ):
                future_node.nodegroup_id = (
                    future_node_nodegroup_node.source_identifier_id
                )

            del editable_future_graph.nodes[future_node.pk]
            current_graph.nodes[future_node.pk] = future_node

    updated_node_ids = {
        str(node.source_identifier_id) for node in editable_future_graph.nodes.values()
    }
    updated_node_ids.add(str(current_graph.root.pk))

    models.Node.objects.filter(
        pk__in=set(previous_node_ids - updated_node_ids)
        | {node.pk for node in editable_future_graph.nodes.values()}
    ).delete()

    for node in current_graph.nodes.values():
        node.save()


def update_edges(current_graph, editable_future_graph, excluded_keys):
    previous_edge_ids = {str(edge.pk) for edge in current_graph.edges.values()}
    current_graph.edges = {}

    for future_edge in list(editable_future_graph.edges.values()):
        if future_edge.source_identifier_id:
            source_edge = future_edge.source_identifier

            for key in vars(source_edge).keys():
                if key not in excluded_keys:
                    setattr(source_edge, key, getattr(future_edge, key))

            source_edge.domainnode_id = future_edge.domainnode_id
            if future_edge.domainnode.source_identifier:
                source_edge.domainnode_id = future_edge.domainnode.source_identifier.pk

            source_edge.rangenode_id = future_edge.rangenode_id
            if future_edge.rangenode.source_identifier:
                source_edge.rangenode_id = future_edge.rangenode.source_identifier.pk

            current_graph.edges[source_edge.pk] = source_edge
        else:
            future_edge.graph_id = current_graph.pk
            future_edge.source_identifier_id = None

            if future_edge.domainnode.source_identifier_id:
                future_edge.domainnode_id = future_edge.domainnode.source_identifier_id

            if future_edge.rangenode.source_identifier_id:
                future_edge.rangenode_id = future_edge.rangenode.source_identifier_id

            del editable_future_graph.edges[future_edge.pk]
            current_graph.edges[future_edge.pk] = future_edge

    updated_edge_ids = {
        str(edge.source_identifier_id) for edge in editable_future_graph.edges.values()
    }

    models.Edge.objects.filter(
        pk__in=set(previous_edge_ids - updated_edge_ids)
        | {edge.pk for edge in editable_future_graph.edges.values()}
    ).delete()

    for edge in current_graph.edges.values():
        edge.save()


def update_cards(current_graph, editable_future_graph, excluded_keys):
    previous_card_ids = {str(card.pk) for card in current_graph.cards.values()}
    current_graph.cards = {}

    for future_card in list(editable_future_graph.cards.values()):
        future_card_nodegroup_node = models.Node.objects.get(
            pk=future_card.nodegroup.pk
        )

        if future_card.source_identifier:
            source_card = future_card.source_identifier

            for key in vars(source_card).keys():
                if key not in excluded_keys:
                    setattr(source_card, key, getattr(future_card, key))

            source_card.nodegroup_id = future_card_nodegroup_node.nodegroup_id
            if future_card_nodegroup_node.source_identifier_id:
                source_card.nodegroup_id = (
                    future_card_nodegroup_node.source_identifier_id
                )

            current_graph.cards[source_card.pk] = source_card
        else:
            future_card.graph_id = current_graph.pk
            future_card.source_identifier_id = None

            future_card.nodegroup_id = future_card_nodegroup_node.nodegroup_id
            if future_card_nodegroup_node.source_identifier_id:
                future_card.nodegroup_id = (
                    future_card_nodegroup_node.source_identifier_id
                )

            del editable_future_graph.cards[future_card.pk]
            current_graph.cards[future_card.pk] = future_card

    updated_card_ids = {
        str(card.source_identifier_id) for card in editable_future_graph.cards.values()
    }

    models.CardModel.objects.filter(
        pk__in=set(previous_card_ids - updated_card_ids)
        | {card.pk for card in editable_future_graph.cards.values()}
    ).delete()

    for card in current_graph.cards.values():
        card.save()


def update_widgets(current_graph, editable_future_graph, excluded_keys):
    previous_widget_ids = {str(widget.pk) for widget in current_graph.widgets.values()}
    current_graph.widgets = {}

    for future_widget in list(editable_future_graph.widgets.values()):
        if future_widget.source_identifier_id:
            source_widget = future_widget.source_identifier

            for key in vars(source_widget).keys():
                if key not in excluded_keys:
                    setattr(source_widget, key, getattr(future_widget, key))

            if future_widget.card.source_identifier_id:
                source_widget.card_id = future_widget.card.source_identifier_id
            if future_widget.node.source_identifier_id:
                source_widget.node_id = future_widget.node.source_identifier_id

            current_graph.widgets[source_widget.pk] = source_widget
        else:
            future_widget.source_identifier_id = None

            if future_widget.card.source_identifier_id:
                future_widget.card_id = future_widget.card.source_identifier_id
            if future_widget.node.source_identifier_id:
                future_widget.node_id = future_widget.node.source_identifier_id

            del editable_future_graph.widgets[future_widget.pk]
            current_graph.widgets[future_widget.pk] = future_widget

    updated_widget_ids = {
        str(widget.source_identifier_id)
        for widget in editable_future_graph.widgets.values()
    }

    models.CardXNodeXWidget.objects.filter(
        pk__in=set(previous_widget_ids - updated_widget_ids)
        | {widget.pk for widget in editable_future_graph.widgets.values()}
    ).delete()

    for widget in current_graph.widgets.values():
        widget.save()


def update_source_graph(current_graph, editable_future_graph, excluded_keys):
    for key, value in vars(editable_future_graph).items():
        if key not in excluded_keys:
            setattr(current_graph, key, value)

    current_graph.root = current_graph.nodes[current_graph.root.pk]
    current_graph.root.set_relatable_resources(
        [node.pk for node in editable_future_graph.root.get_relatable_resources()]
    )
