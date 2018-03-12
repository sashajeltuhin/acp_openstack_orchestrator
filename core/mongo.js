var mongo = require('mongodb');
var dbname = "appscaler";
var MongoClient = require('mongodb').MongoClient;
var ObjectID = mongo.ObjectID;


var getDB = function (name, callback) {
  if (global.db == undefined){
    global.db = {};
  }
  if (name == undefined || name == null){
    name = dbname;
  }
  if (global.db[name] == undefined){
    MongoClient.connect("mongodb://mdb:27017/" + name, function(err, database) {
      if (err !== null){
        callback("Error opening the database " + err, null);
      }
      else{
        global.db[name] = database;
        callback(null, global.db[name]);
      }
    });
  }
  else{
    callback(null, global.db[name]);
  }
}

exports.connectDB = function(name, callback){

  MongoClient.connect("mongodb://mdb:27017/" + name, function(err, database) {
    callback(err, database);
  });
}


var loadData = function(db, col, filter, callback){
  if(filter.distinct !== undefined){
    col.distinct(filter.distinct, filter.query, function(err, items) {
      if (err != null){
        callback(err, null);
      }
      else{
        callback(null, items);
      }
    });
  }
  else{
    col.find(filter.query).skip(filter.skip).limit(filter.limit).sort(filter.order_by).toArray(function(err, items) {
      if (err != null){
        callback(err, null);
      }
      else{
        callback(null, items);
      }
    });
  }
}

var prepFilter = function(f){
  var filter = {};
  filter.query = {};
  filter.order_by = {};
  filter.skip = 0;
  filter.limit = 0;
  for(var key in f){
    if (key == 'order_by'){
      filter.order_by = f[key];
      continue;
    }
    if (key == 'limit'){
      filter.limit = Number(f[key]);
      continue;
    }
    if (key == 'skip'){
      filter.skip = Number(f[key]);
      continue;
    }
    if (key == 'distinct'){
      filter.distinct = f[key];
      continue;
    }
    if (key.indexOf('logexp') > -1){
      var exp = f[key];
      var expVal = buildLogExps(exp);
      if (exp.oper == 'and'){
        filter.query['$and'] = expVal;
      }
      if (exp.oper == 'or'){
        filter.query['$or'] = expVal;
      }
      continue;
    }
    var v = f[key];
    filter.query[key] = buildExp(v, key);

  }
  return filter;
}

function buildLogExps(exp){
  if (Array.isArray(exp.parts) == true){
    return buildLogExpMulti(exp);
  }
  else{
    return buildLogExpSingle(exp.parts);
  }
}

function buildLogExpSingle(exp){
  var singleVal = [];
  for (var e in exp){
    var expObj = {};
    expObj[e] = buildExp(exp[e], e);
    singleVal.push(expObj);
  }
  return singleVal;
}

function buildLogExpMulti(exp){
  var multiVal = [];
  for(var i = 0; i < exp.parts.length; i++){
    var expObj = {};
    var child = exp.parts[i];
    if (child.parts == undefined){
      for (var e in child){
        expObj[e] = buildExp(child[e], e);
      }
    }
//        else if(child.oper == undefined){
//            if (child.oper == 'and'){
//                expObj['$and'] = buildExpArray(child.parts);
//            }
//            if (child.oper == 'or'){
//                expObj['$or'] = buildExpArray(child.parts);
//            }
//        }
    else if (child.oper !== undefined){
      if (child.oper == 'and'){
        expObj['$and'] = buildLogExps(child);
      }
      if (child.oper == 'or'){
        expObj['$or'] = buildLogExps(child);
      }
    }
    multiVal.push(expObj);
  }
  return multiVal;
}

function buildExpArray(parts){
  var ar = [];
  for(var i = 0; i < parts.length; i++){
    var exp = parts[i];
    for (var e in exp){
      var expObj = {};
      expObj[e] = buildExp(exp[e], e);
      ar.push(expObj);
    }
  }
  return ar;
}

function buildExp(v, key){
  var expVal;
  if (Array.isArray(v)){
    if (key == '_id'){
      v = convertIDs(v);
    }
    expVal =  { $in: v };
  }
  else if (v.oper !== undefined && v.val !== undefined){
    if ( Array.isArray(v.val) ){
      if (key == '_id'){
        v.val = convertIDs(v.val);
      }
      if (v.oper == 'in'){
        expVal =  { $in:v.val };
      }
      else if (v.oper == 'all'){
        expVal =  { $all:v.val };
      }
      else if (v.oper == '<>'){
        expVal =  { $nin:v.val };
      }
      else if (v.oper == 'bw' && v.val.length == 2){
        var from = v.val[0];
        var to = v.val[1];
        if (isNumber(from) == true){
          from = Number(from);
          to = Number(to);
        }
        else if(isDate(from) == true){
          from = new Date(from);
          to = new Date(to);
        }
        expVal =  { $gte:from,  $lt: to};
      }
    }
    else if (v.oper == '>'){
      var expv = v.val;
      if (key == '_id'){
        expv = new ObjectID(expv);
      }
      expVal =  { $gt: expv };
    }
    else if (v.oper == '<'){
      var expv = v.val;
      if (key == '_id'){
        expv = new ObjectID(expv);
      }
      expVal =  { $lt: expv };
    }
    else if (v.oper == '>='){
      var expv = v.val;
      if (key == '_id'){
        expv = new ObjectID(expv);
      }
      expVal =  { $gte: expv };
    }
    else if (v.oper == '<='){
      var expv = v.val;
      if (key == '_id'){
        expv = new ObjectID(expv);
      }
      expVal =  { $lte: expv };
    }
    else if (v.oper == 'exist'){
      expVal = {$exists:v.val}
    }
    else if (v.oper == 'near'){
      expVal = {};
      if (v.val && v.val.type && v.val.coordinates){
        var n = {};
        n.$geometry = {};
        n.$geometry.type = v.val.type;
        n.$geometry.coordinates = v.val.coordinates;
        if (v.val.minDistance){
          n.$minDistance = v.val.minDistance;
        }
        if (v.val.maxDistance){
          n.$maxDistance = v.val.maxDistance;
        }
        expVal.$near = n;
      }
    }
    else{
      expVal =  { $ne:v.val };
    }
  }
  else if (String(key) == "_id" || String (key) == 'uid'){
    expVal  = new ObjectID(v);
  }
  else{
    var str = String(v);
    if (str.indexOf("*") !== -1){
      expVal =  { $regex: v, $options: 'i' };
    }
    else if (str.indexOf('<>') !== -1){
      var vl = str.replace('<>', '');
      if (vl.indexOf("null") >= 0){
        expVal = {$ne: null};
      }else{
        expVal = {$ne: vl};
      }
    }
    else if (str.indexOf('>=') !== -1){
      var num = Number(str.replace('>=', ''));
      expVal =  { $gte: num };
    }
    else if (str.indexOf('<=') !== -1){
      var num = Number(str.replace('<=', ''));
      expVal =  { $lte: num };
    }
    else if (str.indexOf('>') !== -1){
      var num = Number(str.replace('>', ''));
      expVal =  { $gt: num };
    }
    else if (str.indexOf('<') !== -1){
      var num = Number(str.replace('<', ''));
      expVal =  { $lt: num };
    }
    else{
      if (str.indexOf("null") >= 0){
        expVal =  null;
      }else{
        expVal =  v;
      }
    }
  }
  return expVal;
}

function convertIDs(v){
  if (v == undefined){
    return [];
  }
  else{
    var ar = [];
    for(var i = 0; i < v.length; i++){
      ar.push(new ObjectID(v[i]));
    }
    return ar;
  }
}

exports.getFilter = function(f){
  return prepFilter(f);
}

function saveDO(dbname, colName, obj, filter, insertCallback, callback){
  var vid = obj;
  if (filter !== undefined && filter !== null){
    filter = prepFilter(filter).query;
  }

  if ((filter !== undefined && filter !== null)|| (vid._id !== null && vid._id !== undefined)){
    if (filter == undefined || filter == null){
      filter = {};
      filter._id = new ObjectID(vid._id);
      vid._id = filter._id;
    }

    if (vid.oninsert == true){//in some cases oninsert function needs to be invoked on updates
      if (insertCallback){
        insertCallback(vid);
      }
      delete vid.oninsert;
    }
    upsertData(dbname, colName, vid, filter, function(err, newid, recs){
      if (err){
        callback(err, null);
      }
      else{
        callback(null, vid, recs);
      }

    });
  }
  else
  {
    if (insertCallback !== undefined && insertCallback !== null){
      insertCallback(vid);
    }
    insertData(dbname, colName, vid, function(err, rec){
      if (err){
        callback(err, null);
      }
      else{
        callback(null, rec);
      }
    });
  }
}

exports.saveDataObj = function(dbname, colName, obj, filter, insertCallback, callback){
  saveDO(dbname, colName, obj, filter, insertCallback, callback);
}


function load(dbn, colname, filter, callback){
  getDB(dbn, function (err, db) {
    if (err !== null){
      callback(err, null);
    }
    else{
      db.collection(colname, function (err, collection) {
        if (err) {
          callback("Enable to access collection. " + err, null);
        }
        else {
          loadData(db, collection, filter, callback);
        }
      });
    }
  });
}

exports.load = function (dbn, colname, filter, callback) {
  load(dbn, colname, filter, callback);
};

exports.aggregate = function(dbname, colname, filter, callback){
  computeData(dbname, colname, filter, callback);
}

var computeData = function(dbname, colname, filter, callback){
  getDB(dbname, function (err, db) {
    if (err !== null){
      callback(err, null);
    }
    else{
      db.collection(colname, function (err, collection) {
        if (err) {
          callback("Enable to access collection. " + err, null);
        }
        else {
          collection.aggregate(filter, function(err, results){
            if (err){
              callback(err, null);
            }
            else{
              callback(null, results);
            }
          })
        }
      });
    }
  });
}

exports.deleteData = function(dbname, colName, req, callback){
  if(req.body.f !== undefined){
    deleteRec(dbname, colName, req.body.f, callback);
  }
  else{
    deleteDO(dbname, colName, req.body.obj, callback);
  }
}

exports.deleteDataObj = function(dbname, colName, obj, callback){
  deleteDO(dbname, colName, obj, callback);
}

function deleteDO(dbname, colName, obj, callback){
  var filter = {_id : obj._id};
  deleteRec(dbname, colName, filter, function(err, ret){
    if (err !== null){
      callback(err, null);
    }
    else{
      callback(null, ret);
    }
  });
}

function deleteRec(dbname, colname, filter, callback){
  var f = prepFilter(filter);
  getDB(dbname, function (err, db) {
    if (err !== null){
      callback(err, null);
    }
    else{
      db.collection(colname, function (err, collection) {
        if (err) {
          callback("Enable to access collection " + err, null);
        }
        else {
          collection.remove(f.query, function (err, ret) {
            if (err !== null) {
              callback(err, null);
            }
            else {
              callback(null, ret);
            }
          });
        }
      });
    }
  });
}

exports.deleteBatch = function (dbname, colname, filter, callback) {
  deleteRec(dbname, colname, filter, callback);
};

function insertData (dbn, colname, obj, callback){
  getDB(dbn, function (err, db) {
    if (err !== null){
      callback(err, null);
    }
    else{
      db.collection(colname, function (err, collection) {
        if (err !== null) {
          callback("Enable to access collection " + err, null);
        }
        else {
          collection.insert(obj, {w:1}, function(err, rec){
            if (err !== null) {
              callback(err, null);
            }
            else {
              if (rec !== null && rec.length > 0) {
                callback(null, rec[0]);
              }
            }
          });
        }
      });
    }
  });
}

exports.insert = function(dbname, colname, obj, callback){
  insertData(dbname, colname, obj, callback);
}

function upsertData(dbn, colname, obj, filter, callback){
    getDB(dbn, function (err, db) {
      if (err !== null){
        callback(err, null);
      }
      else{
        db.collection(colname, function (err, collection) {
          if (err !== null) {
            callback("Enable to access collection " + err, null);
          }
          else {
            var upobj = {};
            var incobj = null;
            for(key in obj){
              if (key !== "_id" && key !== '$inc'){
                upobj[key] = obj[key];
              }
              else if (key == '$inc'){
                incobj = obj[key];
              }
            }
            var set = {$set:upobj};
            if (incobj !== null){
              set = {$set:upobj,$inc:incobj};
            }
            collection.update(filter, set, {upsert:true, w:1, multi:true}, function (err, rec, data) {
              if (err !== null) {
                callback(err, null);
              }
              else {
                if (rec > 0 && data != null) {
                  callback(null, data.upserted, rec);
                }
              }
            });
          }
        });
      }
    });
}

exports.upsert = function (dbname, colname, rawobj, filter, callback) {
  upsertData(dbname, colname, rawobj, filter, callback);
}

exports.upsertAndLoad = function (dbn, colname, rawobj, filter, returnUpdate, callback) {
  upsertAndLoad(dbn, colname, rawobj, filter, returnUpdate, callback);
}

function upsertAndLoad(dbn, colname, obj, filter, returnUpdate, callback){
  if (err !== null){
    callback(err, null);
  }else{
    getDB(dbn, function (err, db) {
      if (err !== null){
        callback(err, null);
      }
      else{
        db.collection(colname, function (err, collection) {
          if (err !== null) {
            callback("Enable to access collection " + err, null);
          }
          else {
            var f = prepFilter(filter);
            collection.findAndModify(f.query, rawobj, {"upsert": true}, {"new":returnUpdate}, function (err, rec) {
              if (err !== null) {
                callback(err, null);
              }
              else{
                callback(null, rec);
              }
            });
          }
        });
      }
    });
  }
}


var count = function(dbname, colname, filter, callback){
  getDB(dbname, function(err, db){
    if (err !== null){
      callback(err, null);
    }
    else{
      db.collection(colname, function(err, collection){
        if (err !== null){
          callback("Enable to access collection " + err, null);
        }
        else
        {
          collection.count(filter.query, function(err, rec) {
            if (err !== null){
              callback(err, null);
            }
            else{

              callback(null, rec);
            }
          });
        }
      });
    }
  });
}

exports.count = function(dbname, colname, filter, callback){
  count(dbname, colname, filter, callback);
}


//deep object iteration
function prepDates(obj){
  for(var key in obj){
    if (key !== '_id' && obj[key] !== null && obj[key] !== undefined){
      if (Array.isArray(obj[key])){
        for(var i=0; i < obj[key].length; i++){
          prepDates(obj[key][i]);
        }
      }
      else if (typeof obj[key] == 'object'){
        prepDates(obj[key]);
      }
      else{
        if (typeof obj[key] == 'string' && isDate(obj[key]) == true){
          obj[key] = new Date(obj[key]);
        }
      }
    }
  }
}


function isNumber(x){
  return (typeof x === 'number') && (x % 1 === 0);
}

function isDate(x){
  var d = new Date(x);
  if (d instanceof Date){
    if (isNaN(d.getTime())){
      return false;
    }
    else{
      return true;
    }
  }
  else{
    return false;
  }
}

Array.prototype.equals = function (array) {
  // if the other array is a falsy value, return
  if (!array)
    return false;

  // compare lengths - can save a lot of time
  if (this.length != array.length)
    return false;

  for (var i = 0, l=this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i]))
        return false;
    }
    else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
}

