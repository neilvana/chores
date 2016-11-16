import falcon
import json
from bson import json_util
from bson import objectid
import pymongo
from datetime import datetime, timedelta
from pytz import timezone, utc
from operator import itemgetter
import math

app = application = falcon.API()
dbName = "chores"
dbClient = pymongo.MongoClient("mongodb://localhost/{0}".format(dbName))

class Kids:
   def __init__(self, db) :
      self.db = db
   def on_get(self, req, resp) :
      kids = self.db.kids.find()
      resp.body = json_util.dumps({"kids":list(kids)})

class Chore:
   def __init__(self,db) :
      self.db = db

   def on_get(self, req, resp, id) :
      chore = self.db.chores.find_one({'_id':objectid.ObjectId(id)})
      resp.body = json_util.dumps(chore)
      resp.status = falcon.HTTP_200

   def on_delete(self, req, resp, id) :
      db.chores.remove({'_id':objectid.ObjectId(id)})
      resp.status = falcon.HTTP_204

   def on_post(self, req, resp, id) :
      data = json.loads(req.stream.read())
      chore = {
            '_id' : objectid.ObjectId(id),
            'name' : data['name'],
            'type' : data['type'],
            'assigned' : data['assigned'],
            'sundays' : data['sundays'],
            'independent' : data['independent'],
            'points' : data['points']
         }
      self.db.chores.update({'_id': objectid.ObjectId(id)},chore)
      resp.status = falcon.HTTP_204

class Chores:
   def __init__(self, db) :
      self.db = db

   def get_all_chores(self) :
      chores = self.db.chores.find()
      kids = self.db.kids.find()
      kidLookup = {}
      for kid in kids:
         kidLookup[kid['label']] = kid['name']
      choreList = []
      for chore in chores:
         assignedNamed = []
         for assigned in chore['assigned'] :
            assignedNamed.append(kidLookup[assigned])
         chore['assignedNamed'] = assignedNamed
         choreList.append(chore)
      return choreList

   def get_available_chores(self,kid,now) :
      query = { "assigned" : kid }
      beginOfDay = now.replace(hour=0,minute=0,second=0,microsecond=0)
      if now.weekday() == 6:
         query['sundays'] = True
         beginOfWeek = beginOfDay
      else :
         beginOfWeek = beginOfDay - timedelta(days=now.weekday()+1)

      def calculateChoreSortValue(item) :
         if item['type']=="daily-required" :
            return item['points'] + 150000
         else :
            return item['points']

      chores = self.db.chores.find(query)
      availableChores = []
      for chore in chores:
         query = { "choreId" : chore['_id'] }
         if chore['type'] == 'weekly' :
            query['done'] = { "$gt" : beginOfWeek}
         else :
            query['done'] = { "$gt" : beginOfDay}
         if chore['independent']:
            query['kid'] = kid
         if self.db.complete.find(query).count() == 0 :
            availableChores.append(chore)
      return sorted(availableChores, key=calculateChoreSortValue, reverse=True)

   def on_get(self,req,resp) :
      kid = req.get_param("kid",required=False)
      if kid is None :
         # Get all chores
         resp.body = json_util.dumps({"chores" : self.get_all_chores()})
      else:
         # Get available chores for kid
         date = req.get_param_as_int("date",required=False)
         if date is None :
            now = datetime.now(tz=timezone('US/Central'))
         else :
            date = round(date/1000)
            now = datetime.fromtimestamp(date, tz=timezone('US/Central'))
         resp.body = json_util.dumps({"chores" : self.get_available_chores(kid,now),"date" : now})

   def on_post(self,req,resp) :
      data = json.loads(req.stream.read())
      chore = {
            'name' : data['name'],
            'type' : data['type'],
            'assigned' : data['assigned'],
            'sundays' : data['sundays'],
            'independent' : data['independent'],
            'points' : data['points']
         }
      self.db.chores.insert(chore)
      resp.status = falcon.HTTP_204

class CompletedChore:
   '''
   Represents a single completed chores.
   '''
   def __init__(self,db) : 
      self.db = db
   def on_delete(self,req,resp,id) :
      self.db.complete.remove(objectid.ObjectId(id))
      resp.status = falcon.HTTP_204

class CompletedChores:
   '''
   Represents a set of comleted chores.
   '''
   def __init__(self,db) : 
      self.db = db

   def get_completed_chores(self,kid,now) :
      beginOfDay = now.replace(hour=0,minute=0,second=0,microsecond=0)
      endOfDay = beginOfDay + timedelta(days=1)
      completed = self.db.complete.find({
         "kid" : kid,
         "done" : { "$gte" : beginOfDay, "$lte" : endOfDay }
      })
      total = 0
      completedChores = []
      for chore in completed :
         total = total + chore['points']
         completedChores.append(chore)
      return completedChores,total

   def on_get(self,req,resp) :
      kid = req.get_param("kid")
      date = req.get_param_as_int("date",required=False)
      if date is None :
         now = datetime.now(tz=timezone('US/Central'))
      else :
         date = round(date/1000)
         now = datetime.fromtimestamp(date, tz=timezone('US/Central'))
      completedChores,total = self.get_completed_chores(kid,now)
      resp.body = json_util.dumps({"chores" : completedChores, "total" : total, "date" : now})

   def on_post(self,req,resp) :
      data = json.loads(req.stream.read())
      kid = data['kid']
      choreId = data['choreId']
      if 'date' in data :
         date = round(data['date']/1000)
         now = datetime.fromtimestamp(date, tz=timezone('US/Central'))
      else :
         now = datetime.now(tz=timezone('US/Central'))

      chore = self.db.chores.find_one({
         "assigned" : kid,
         "_id" : objectid.ObjectId(choreId)})
      if chore is None :
         raise falcon.HTTPBadRequest('Invalid Parameter Value', 'The chore id specified does not exist. {0} {1}'.format(kid, choreId))
      self.db.complete.insert({
         'name' : chore['name'],
         'kid' : kid,
         'points' : chore['points'],
         'choreId' : chore['_id'],
         'done' : now})
      if chore['type'] == 'one-time':
         self.db.chores.remove({'_id' : chore['_id']})
         if (chore['independent'] and len(chore['assigned']) > 1) :
            chore['assigned'].remove(kid)
            self.db.chores.insert(chore)
      completedChores,total = self.get_completed_chores(kid,now)
      resp.body = json_util.dumps({"completed" : completedChores, "total" : total, "date" : now})


class ChoreSummaries:
   def __init__(self,db) :
      self.db = db

   def on_get(self,req,resp):
      kids = self.db.kids.find()
      date = req.get_param_as_int("date",required=False)
      if date is None :
         now = datetime.now(tz=timezone('US/Central'))
      else :
         date = round(date/1000)
         now = datetime.fromtimestamp(date, tz=timezone('US/Central'))
      endOfDay = now.replace(hour=0,minute=0,second=0,microsecond=0) + timedelta(days=1)
      summaries = []
      for kid in kids:
         chores = Chores(self.db)
         complete = CompletedChores(self.db)
         completedChores, dailyTotal = complete.get_completed_chores(kid['label'],now)
         requiredPoints = 0
         for chore in chores.get_available_chores(kid['label'],now):
            if chore['type'] == 'daily-required' :
               requiredPoints = requiredPoints + chore['points']
         result = self.db.complete.aggregate([
            { "$match" : { "kid" : kid['label'], "done" : { "$lt" : endOfDay} } },
            { "$project" : { "kid" : "$kid", "points" : "$points" } },
            { "$group" : { "_id" : "kid", "total" : { "$sum" : "$points" } } }
            ])
         if len(result['result']) > 0 :
            total = result['result'][0]['total']
         else :
            total = 0
         age = now - kid['birthday'].replace(tzinfo=utc)
         age = int(math.floor(age.days/365))
         pointsNeeded = age*10 - dailyTotal
         if pointsNeeded < requiredPoints :
            pointsNeeded = requiredPoints

         percent = 100.0*(age*10-pointsNeeded)/(age*10)
         summaries.append({
            'kid' : kid['label'],
            'name' : kid['name'],
            'age' : age,
            'total' : total,
            'dailyTotal' : dailyTotal,
            'percentDone' : percent
            })
      resp.body = json_util.dumps({"summaries" : summaries})



db = dbClient[dbName]
app.add_route('/kids',Kids(db))
app.add_route('/kids/summaries',ChoreSummaries(db))
app.add_route('/completed-chores/{id}',CompletedChore(db))
app.add_route('/completed-chores',CompletedChores(db))
app.add_route('/chores/{id}',Chore(db))
app.add_route('/chores',Chores(db))


