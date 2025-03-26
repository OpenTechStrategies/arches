import arches from 'arches';

const resourceLookup = {};

const resourceUtils = {
    lookupResourceInstanceData(resourceid, usecache = true) {
        if (resourceLookup[resourceid] && usecache) {
            return Promise.resolve(resourceLookup[resourceid]);
        } else {
            return fetch(`${arches.urls.search_results}?id=${resourceid}&tiles=true`)
                .then(response => response.ok ? response.json() : null)
                .then(json => {
                    resourceLookup[resourceid] = json?.results?.hits?.hits?.[0];
                    return resourceLookup[resourceid];
                });
        }
    },

    lookupResourceInstanceDataByQuery(query) {
        const searchParams = new URLSearchParams({
            'advanced-search': JSON.stringify([query]),
            tiles: true
        });

        return fetch(`${arches.urls.search_results}?${searchParams}`)
            .then(response => response.ok ? response.json() : null)
            .then(json => json?.results?.hits?.hits ?? []);
    },

    getNodeValues(queryClause, tiles, graph) {
        let nodeId;
        let foundTiles = [];
        const returnTiles = !!queryClause.returnTiles;

        const resolveWidgetLabel = (cardWidgetPath, cards, widgets) => {
            let cardName, cardids;
            let widgetLabel = '';
            const parts = cardWidgetPath.split('.');

            if (parts.length === 1) {
                widgetLabel = parts[0];
            } else if (parts.length === 2) {
                cardName = parts[0];
                widgetLabel = parts[1];
            }

            if (cardName) {
                cardids = cards.filter(card => card.name === cardName).map(card => card.cardid);
                widgets = widgets.filter(widget => cardids.includes(widget.card_id));
            }

            const nodeIds = widgets
                .filter(widget => widget.label === widgetLabel)
                .map(widget => widget.node_id);

            if (!nodeIds || nodeIds.length !== 1) {
                console.warn(`Can't resolve path '${cardWidgetPath}' into a single nodeid`);
            }

            return nodeIds;
        };

        if (queryClause.nodeId) {
            nodeId = [queryClause.nodeId];
        } else if (queryClause.nodeName) {
            const node = graph.nodes.find(n => n.name === queryClause.nodeName);
            if (node) {
                nodeId = [node.nodeid];
            }
        } else if (queryClause.widgetLabel) {
            nodeId = resolveWidgetLabel(queryClause.widgetLabel, graph.cards, graph.widgets);
        }

        if (nodeId?.length === 1) {
            nodeId = nodeId[0];
            foundTiles = tiles.filter(tile => Object.keys(tile.data).includes(nodeId));

            if (queryClause.where) {
                const whereNodeId = queryClause.where.nodeId
                    ? [queryClause.where.nodeId]
                    : resolveWidgetLabel(queryClause.where.widgetLabel, graph.cards, graph.widgets);

                if (whereNodeId?.length === 1 && queryClause.where.contains) {
                    foundTiles = foundTiles.filter(tile => tile.data[whereNodeId[0]]?.includes(queryClause.where.contains));
                }
            }

            return returnTiles
                ? foundTiles
                : foundTiles.map(tile => tile.data[nodeId]).flat(Infinity);
        }

        return undefined;
    }
};

export default resourceUtils;
