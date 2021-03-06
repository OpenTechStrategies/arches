'''
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
'''

import uuid
import json
import urlparse
from datetime import datetime
from datetime import timedelta
from copy import copy, deepcopy
from django.contrib.auth.models import User
from django.db import transaction
from django.http import HttpRequest
from django.utils.translation import ugettext as _
from arches.app.datatypes.datatypes import DataTypeFactory
from arches.app.models import models
from arches.app.models.concept import Concept
from arches.app.models.tile import Tile
from arches.app.models.card import Card
from arches.app.models.graph import Graph
from arches.app.models.models import ResourceInstance
from arches.app.models.resource import Resource
from arches.app.models.system_settings import settings
from arches.app.utils.geo_utils import GeoUtils
from arches.app.utils.couch import Couch
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
import arches.app.views.search as search



class MobileSurvey(models.MobileSurveyModel):
    """
    Used for mapping complete mobile survey objects to and from the database
    """

    class Meta:
        proxy = True

    def __init__(self, *args, **kwargs):
        super(MobileSurvey, self).__init__(*args, **kwargs)
        # from models.MobileSurveyModel
        # self.id = models.UUIDField(primary_key=True, default=uuid.uuid1)
        # self.name = models.TextField(null=True)
        # self.active = models.BooleanField(default=False)
        # self.createdby = models.ForeignKey(User, related_name='createdby')
        # self.lasteditedby = models.ForeignKey(User, related_name='lasteditedby')
        # self.users = models.ManyToManyField(to=User, through='MobileSurveyXUser')
        # self.groups = models.ManyToManyField(to=Group, through='MobileSurveyXGroup')
        # self.startdate = models.DateField(blank=True, null=True)
        # self.enddate = models.DateField(blank=True, null=True)
        # self.description = models.TextField(null=True)
        # self.bounds = models.MultiPolygonField(null=True)
        # self.tilecache = models.TextField(null=True)
        # self.onlinebasemaps = JSONField(blank=True, null=True, db_column='onlinebasemaps')
        # self.datadownloadconfig = JSONField(blank=True, null=True, default='{"download":false, "count":1000, "resources":[]}')
        # end from models.MobileSurvey

        self.couch = Couch()

    def save(self):
        super(MobileSurvey, self).save()
        db = self.couch.create_db('project_' + str(self.id))
        self.load_data_into_couch()
        return db

    def delete(self):
        try:
            self.couch.delete_db('project_' + str(self.id))
        except Exception as e:
            print(e), _("Could not delete database in CouchDB")
        super(MobileSurvey, self).delete()

    def collect_card_widget_node_data(self, graph_obj, graph, parentcard, nodegroupids=[]):
        nodegroupids.append(str(parentcard.nodegroup_id))
        for node in graph_obj['nodes']:
            if node['nodegroup_id'] == str(parentcard.nodegroup_id):
                found = False
                for widget in graph_obj['widgets']:
                    if node['nodeid'] == str(widget.node_id):
                        found = True
                        try:
                            collection_id = node['config']['rdmCollection']
                            concept_collection = Concept().get_child_collections_hierarchically(collection_id)
                            widget.config['options'] = concept_collection
                        except Exception as e:
                            pass
                        break
                if not found:
                    for card in graph_obj['cards']:
                        if card['nodegroup_id'] == node['nodegroup_id']:
                            widget = models.DDataType.objects.get(pk=node['datatype']).defaultwidget
                            if widget:
                                widget_model = models.CardXNodeXWidget()
                                widget_model.node_id = node['nodeid']
                                widget_model.card_id = card['cardid']
                                widget_model.widget_id = widget.pk
                                widget_model.config = widget.defaultconfig
                                try:
                                    collection_id = node['config']['rdmCollection']
                                    if collection_id:
                                        concept_collection = Concept().get_child_collections_hierarchically(collection_id)
                                        widget_model.config['options'] = concept_collection
                                except Exception as e:
                                    pass
                                widget_model.label = node['name']
                                graph_obj['widgets'].append(widget_model)
                            break

                if node['datatype'] == 'resource-instance' or node['datatype'] == 'resource-instance-list':
                    if node['config']['graphid'] is not None:
                        try:
                            graphuuid = uuid.UUID(node['config']['graphid'][0])
                            graph_id = unicode(graphuuid)
                        except ValueError as e:
                            graphuuid = uuid.UUID(node['config']['graphid'])
                            graph_id = unicode(graphuuid)
                        node['config']['options'] = []
                        for resource_instance in Resource.objects.filter(graph_id=graph_id):
                            node['config']['options'].append({'id': str(resource_instance.pk), 'name': resource_instance.displayname})

        for subcard in parentcard.cards:
            self.collect_card_widget_node_data(graph_obj, graph, subcard, nodegroupids)

        return graph_obj

    def serialize_for_mobile(self):
        """
        serialize to a different form than used by the internal class structure
        used to append additional values (like parent ontology properties) that
        internal objects (like models.Nodes) don't support
        """
        serializer = JSONSerializer()
        serializer.geom_format = 'geojson'
        obj = serializer.handle_model(self)
        ordered_cards = self.get_ordered_cards()
        expired = (datetime.strptime(str(self.enddate), '%Y-%m-%d') - datetime.now() + timedelta(hours=24)).days < 0
        ret = JSONSerializer().serializeToPython(obj)
        if expired:
            self.active = False
            super(MobileSurvey, self).save()
            ret['active'] = False
        graphs = []
        card_lookup = {}
        for card in self.cards.all():
            if str(card.graph_id) in card_lookup:
                card_lookup[str(card.graph_id)].append(card)
            else:
                card_lookup[str(card.graph_id)] = [card]
        for graphid, cards in iter(card_lookup.items()):
            graph = Graph.objects.get(pk=graphid)
            graph_obj = graph.serialize(exclude=['domain_connections', 'edges', 'relatable_resource_model_ids'])
            graph_obj['widgets'] = list(models.CardXNodeXWidget.objects.filter(card__graph=graph).distinct())
            nodegroupids = []
            for card in cards:
                topcard = Card.objects.get(pk=card.cardid)
                self.collect_card_widget_node_data(graph_obj, graph, topcard, nodegroupids)
            graph_obj['widgets'] = serializer.serializeToPython(graph_obj['widgets'])

            nodegroup_filters = {'nodes': 'nodegroup_id', 'cards': 'nodegroup_id', 'nodegroups': 'nodegroupid'}

            for prop, id in iter(nodegroup_filters.items()):
                relevant_items = [item for item in graph_obj[prop] if item[id] in nodegroupids]
                graph_obj[prop] = relevant_items

            relevant_cardids = [card['cardid'] for card in graph_obj['cards']]
            relevant_widgets = [widget for widget in graph_obj['widgets'] if str(widget['card_id']) in relevant_cardids]
            graph_obj['widgets'] = relevant_widgets

            graphs.append(serializer.serializeToPython(graph_obj))

        ret['graphs'] = graphs
        ret['cards'] = ordered_cards
        try:
            bounds = json.loads(ret['bounds'])
            ret['bounds'] = bounds
            if (bounds['type'] == 'MultiPolygon'):
                singlepart = GeoUtils().convert_multipart_to_singlepart(bounds)
                ret['bounds'] = singlepart
        except TypeError as e:
            print 'Could not parse', ret['bounds'], e
        return ret

    def serialize(self, fields=None, exclude=None):
        """
        serialize to a different form than used by the internal class structure
        used to append additional values (like parent ontology properties) that
        internal objects (like models.Nodes) don't support
        """
        serializer = JSONSerializer()
        serializer.geom_format = 'geojson'
        obj = serializer.handle_model(self)
        ordered_cards = self.get_ordered_cards()
        ret = JSONSerializer().serializeToPython(obj)
        ret['cards'] = ordered_cards
        try:
            bounds = json.loads(ret['bounds'])
            ret['bounds'] = bounds
            if (bounds['type'] == 'MultiPolygon'):
                singlepart = GeoUtils().convert_multipart_to_singlepart(bounds)
                ret['bounds'] = singlepart
        except TypeError as e:
            print 'Could not parse', ret['bounds'], e
        return ret

    def get_ordered_cards(self):
        ordered_cards = models.MobileSurveyXCard.objects.filter(mobile_survey=self).order_by('sortorder')
        ordered_card_ids = [unicode(mpc.card_id) for mpc in ordered_cards]
        return ordered_card_ids

    def handle_reviewer_edits(self, userid, tile):
        user = User.objects.get(pk=userid)
        if hasattr(user, 'userprofile') is not True:
            models.UserProfile.objects.create(user=user)
        if user.userprofile.is_reviewer():
            tile.make_provisional_authoritative(user)

    def assign_provisional_edit(self, userid, edit, tile):
        if userid in tile.provisionaledits:
            if edit['timestamp'] >= tile.provisionaledits[userid]['timestamp']:
                # If the mobile user edits are newer by UTC timestamp, overwrite the tile data
                tile.provisionaledits[userid] = edit
        else:
            tile.provisionaledits[userid] = edit
        self.handle_reviewer_edits(userid, tile)

    def push_edits_to_db(self):
        # read all docs that have changes
        # save back to postgres db
        db = self.couch.create_db('project_' + str(self.id))
        user_lookup = {}
        is_reviewer = False
        ret = []
        with transaction.atomic():
            couch_docs = self.couch.all_docs(db)
            for row in couch_docs:
                ret.append(row)
                if row.doc['type'] == 'resource':
                    if 'provisional_resource' in row.doc and row.doc['provisional_resource'] == 'true':
                        resourceinstance, created = ResourceInstance.objects.update_or_create(
                            resourceinstanceid=uuid.UUID(str(row.doc['resourceinstanceid'])),
                            defaults={
                                'graph_id': uuid.UUID(str(row.doc['graph_id']))
                            }
                        )
                        print('Resource {0} Saved'.format(row.doc['resourceinstanceid']))

            for row in couch_docs:
                ret.append(row)
                if row.doc['type'] == 'tile':
                    if 'provisionaledits' in row.doc and row.doc['provisionaledits'] is not None:
                        try:
                            tile = Tile.objects.get(tileid=row.doc['tileid'])
                            if row.doc['provisionaledits'] != '':
                                for user_edits in row.doc['provisionaledits'].items():
                                    # user_edits is a tuple with the user number in
                                    # position 0, prov. edit data in position 1
                                    for nodeid, value in iter(user_edits[1]['value'].items()):
                                        datatype_factory = DataTypeFactory()
                                        node = models.Node.objects.get(nodeid=nodeid)
                                        datatype = datatype_factory.get_instance(node.datatype)
                                        newvalue = datatype.process_mobile_data(tile, node, db, row.doc, value)
                                        if newvalue is not None:
                                            user_edits[1]['value'][nodeid] = newvalue

                                    if tile.provisionaledits is None:
                                        tile.provisionaledits = {}
                                        tile.provisionaledits[user_edits[0]] = user_edits[1]
                                        self.handle_reviewer_edits(user_edits[0], tile)
                                    else:
                                        self.assign_provisional_edit(user_edits[0], user_edits[1], tile)

                            # If there are conflicting documents, lets clear those out
                            if '_conflicts' in row.doc:
                                for conflict_rev in row.doc['_conflicts']:
                                    conflict_data = db.get(row.id, rev=conflict_rev)
                                    if conflict_data['provisionaledits'] != '':
                                        for user_edits in conflict_data['provisionaledits'].items():
                                            self.assign_provisional_edit(user_edits[0], user_edits[1], tile)
                                    # Remove conflicted revision from couch
                                    db.delete(conflict_data)

                        # TODO: If user is provisional user, apply as provisional edit
                        except Tile.DoesNotExist:
                            tile = Tile(row.doc)
                            if row.doc['provisionaledits'] != '':
                                for user_edits in row.doc['provisionaledits'].items():
                                    for nodeid, value in iter(user_edits[1]['value'].items()):
                                        datatype_factory = DataTypeFactory()
                                        node = models.Node.objects.get(nodeid=nodeid)
                                        datatype = datatype_factory.get_instance(node.datatype)
                                        newvalue = datatype.process_mobile_data(tile, node, db, row.doc, value)
                                        if newvalue is not None:
                                            user_edits[1]['value'][nodeid] = newvalue
                                    tile.provisionaledits[user_edits[0]] = user_edits[1]
                                    self.handle_reviewer_edits(user_edits[0], tile)

                        # If user is reviewer, apply as authoritative edit
                        if tile.provisionaledits != '':
                            for user_edits in tile.provisionaledits.items():
                                if user_edits[0] not in user_lookup:
                                    user = User.objects.get(pk=user_edits[0])
                                    user_lookup[user_edits[0]] = user.groups.filter(name='Resource Reviewer').exists()

                            for user_id, is_reviewer in user_lookup.items():
                                if is_reviewer:
                                    try:
                                        tile.data = tile.provisionaledits.pop(user_id)['value']
                                    except KeyError:
                                        pass

                        tile.save()
                        tile_serialized = json.loads(JSONSerializer().serialize(tile))
                        tile_serialized['type'] = 'tile'
                        self.couch.update_doc(db, tile_serialized, tile_serialized['tileid'])
                        print('Tile {0} Saved'.format(row.doc['tileid']))
                        db.compact()
        return ret

    def collect_resource_instances_for_couch(self):
        """
        Uses the data definition configs of a mobile survey object to search for
        resource instances relevant to a mobile survey. Takes a user object which
        is required for search.
        """
        query = self.datadownloadconfig['custom']
        resource_types = self.datadownloadconfig['resources']
        instances = {}
        if query in ('', None) and len(resource_types) == 0:
            print "No resources or data query defined"
        else:
            request = HttpRequest()
            request.user = self.lasteditedby
            request.GET['mobiledownload'] = True
            request.GET['resourcecount'] = self.datadownloadconfig['count']
            if query in ('', None):
                if len(self.bounds.coords) == 0:
                    default_bounds = settings.DEFAULT_BOUNDS
                    default_bounds['features'][0]['properties']['inverted'] = False
                    request.GET['mapFilter'] = json.dumps(default_bounds)
                else:
                    request.GET['mapFilter'] = json.dumps({u'type': u'FeatureCollection', 'features': [{'geometry': json.loads(self.bounds.json)}]})
                request.GET['typeFilter'] = json.dumps([{'graphid': resourceid, 'inverted': False} for resourceid in self.datadownloadconfig['resources']])
            else:
                parsed = urlparse.urlparse(query)
                urlparams = urlparse.parse_qs(parsed.query)
                for k, v in urlparams.iteritems():
                    request.GET[k] = v[0]
            search_res_json = search.search_results(request)
            search_res = JSONDeserializer().deserialize(search_res_json.content)
            try:
                instances = {hit['_source']['resourceinstanceid']: hit['_source'] for hit in search_res['results']['hits']['hits']}
                # if we didn't get our limit of resource instances using a spatial filter
                # let's try to get resource instances that don't have spatial data
                if len(instances.keys()) < int(self.datadownloadconfig['count']):
                    request.GET['mapFilter'] = '{}'
                    request.GET['resourcecount'] = int(self.datadownloadconfig['count']) - len(instances.keys())
                    search_res_json = search.search_results(request)
                    search_res = JSONDeserializer().deserialize(search_res_json.content)
                    for hit in search_res['results']['hits']['hits']:
                        instances[hit['_source']['resourceinstanceid']] = hit['_source']
            except KeyError:
                print 'no instances found in', search_res
        return instances

    def load_tiles_into_couch(self, instances):
        """
        Takes a mobile survey object, a couch database instance, and a dictionary
        of resource instances to identify eligible tiles and load them into the
        database instance
        """
        db = self.couch.create_db('project_' + str(self.id))
        cards = self.cards.all()
        for card in cards:
            tiles = models.TileModel.objects.filter(nodegroup=card.nodegroup_id)
            tiles_serialized = json.loads(JSONSerializer().serialize(tiles))
            for tile in tiles_serialized:
                if str(tile['resourceinstance_id']) in instances:
                    try:
                        tile['type'] = 'tile'
                        self.couch.update_doc(db, tile, tile['tileid'])
                        # couch_record = db.get(tile['tileid'])
                        # if couch_record == None:
                        #     db[tile['tileid']] = tile
                        # else:
                        #     if couch_record['data'] != tile['data']:
                        #         couch_record['data'] = tile['data']
                        #         db[tile['tileid']] = couch_record
                    except Exception as e:
                        print e, tile

    def load_instances_into_couch(self, instances):
        """
        Takes a mobile survey object, a couch database instance, and a dictionary
        of resource instances and loads them into the database instance.
        """
        db = self.couch.create_db('project_' + str(self.id))
        for instanceid, instance in instances.iteritems():
            try:
                instance['type'] = 'resource'
                self.couch.update_doc(db, instance, instanceid)
            except Exception as e:
                print e, instance

    def load_data_into_couch(self):
        """
        Takes a mobile survey, a couch database intance and a django user and loads
        tile and resource instance data into the couch instance.
        """
        instances = self.collect_resource_instances_for_couch()
        self.load_tiles_into_couch(instances)
        self.load_instances_into_couch(instances)
