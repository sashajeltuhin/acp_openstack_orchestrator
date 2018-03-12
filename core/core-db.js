//
// Copyright (c) Apprenda, Inc. All rights reserved
//

var sql = require('mssql')


var CoreDb = function (server, user, pass) {
	if (user && pass && server) {
		this.config = {
			user: user,
			password: pass,
			server: server,
			database: 'SaaSGrid Core'
		}
	}
}

CoreDb.prototype.getAuthenticationUri = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [setting_value] as AuthenticationUri " +
			"FROM [SaaSGrid Core].[dbo].[SaaSGrid_Settings] " +
			"where setting_name = 'CitadelUri'";
		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			// should only be one recordset
			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getPlatformVersion = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		request.query('select * from PlatformVersion', function (err, recordset) {
			if (err) { callback(err, null); }

			// should only be one recordset
			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getHosts = function (name, callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }
    var q = "select * from dbo.Artifact_Host";
    if (name){
      q = "select id from dbo.Artifact_Host where [hostname]='" + name + "'";
    }

		var request = new sql.Request(connection);
		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getClouds = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		request.query('select * from Cloud', function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getCacheNodes = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		request.query('select * from CacheNode', function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getApplications = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [application_alias] as ApplicationAlias" +
			",[version_alias] as VersionAlias" +
			",[stage] as Stage" +
			",[developer_alias] as DeveloperAlias " +
			"FROM [SaaSGrid Core].[operations].[all_applications] " +
			"WHERE stage != 'Deleted' and developer_alias != 'apprenda' " +
			"ORDER BY [application_alias]";
		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getApprendaApplications = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [application_alias] as ApplicationAlias" +
			",[version_alias] as VersionAlias" +
			",[stage] as Stage" +
			",[developer_alias] as DeveloperAlias " +
			"FROM [SaaSGrid Core].[operations].[all_applications] " +
			"WHERE stage != 'Deleted' and developer_alias = 'apprenda' " +
			"ORDER BY [application_alias]";
		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getAllWorkloads = function (includeApprenda, callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [deployed_artifact_id] as Id " +
			",[deployed_location] as Location " +
			",[deploy_time] as Deployed " +
			",[artifact_name] as ArtifactName " +
			",[artifact_type] as 'Type' " +
			",[version_alias] as 'Version' " +
			",[version_stage] as Stage " +
			",[app_alias] as 'AppAlias' " +
			",[developer_alias] as 'DevTeam' " +
			",[service_repository_location] as 'RepoLocation' " +
			",[storage_quota_name] as 'StorageQuota' " +
			",[host_name] as 'Host' " +
			",[host_state] as 'HostState' " +
			",[deployed_policy_name] as 'Policy' " +
			"FROM [SaaSGrid Core].[dbo].[deployed_artifact_details]";
		if (!includeApprenda) {
			q += " WHERE [developer_alias] != 'apprenda'";
		}
		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getWorkload = function (workloadId, callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [deployed_artifact_id] as Id " +
			",[deployed_location] as Location " +
			",[deploy_time] as Deployed " +
			",[artifact_name] as ArtifactName " +
			",[artifact_type] as 'Type' " +
			",[version_alias] as 'Version' " +
			",[version_stage] as Stage " +
			",[app_alias] as 'AppAlias' " +
			",[developer_alias] as 'DevTeam' " +
			",[service_repository_location] as 'RepoLocation' " +
			",[storage_quota_name] as 'StorageQuota' " +
			",[host_name] as 'Host' " +
			",[host_state] as 'HostState' " +
			",[deployed_policy_name] as 'Policy' " +
			"FROM [SaaSGrid Core].[dbo].[deployed_artifact_details] " +
			"WHERE [deployed_artifact_id] = " + workloadId;

		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getUtilization = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [hostname] as Hostname " +
			",[total_cpu] as 'CpuTotal' " +
			",[total_memory] as 'MemTotal' " +
			",[allocated_cpu] as 'CpuAllocated' " +
			",[allocated_memory] as 'MemAllocated' " +
			",[type] as 'NodeType' " +
			"FROM [SaaSGrid Core].[dbo].[Host_Allocation] " +
			"WHERE [type] in (1, 4)";

		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

//removeNode method does not remove records from Artifact_Host and the utilization becomes inflated
CoreDb.prototype.cleanUpNode = function (hostname, callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q =
			"delete FROM [SaaSGrid Core].[dbo].[Artifact_Host] " +
			"WHERE [hostname] = '" + hostname + "'";

		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getAddon = function (alias, callback) {
	console.log("getscale addon", this.config);
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [Id] as 'AddonID' " +
			",[ProvisioningLocation] as 'URL' " +
			",[ProvisioningUsername] as 'AdminUser' " +
            ",[DeploymentNotes] as 'ScaleLog' " +
			",[IsEnabled] as 'IsEnabled' " +
			"FROM [SaaSGrid Core].[dbo].[AddOn] " +
			"WHERE [Alias] = '" + alias + "'";

		request.query(q, function (err, recordset) {
			console.log("request returned", err, recordset);
			if (err)
			{
				callback(err, null);
			}

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getAddonProps = function (id, callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [Key] as 'Key' " +
			",[Value] as 'Val' " +
			"FROM [SaaSGrid Core].[dbo].[AddOnProperty] " +
			"WHERE [AddOnId] = " + id;

		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.regScaleNode = function (addon, type, nodeid, log, sname, callback) {
    if (!log[type]){
        log[type] = {};
    }
	if (nodeid) {
		log[type][sname] = nodeid;
	}
	else{
		delete log[type][sname];
	}
    console.log('local log', log);
    callback(null, nodeid);
}

CoreDb.prototype.getScaleAddNode = function (addon, type, log, sname, callback) {
    console.log('local log', log);
    var nodeID;
    if (log[type] && log[type][sname]){
        nodeID = log[type][sname];
    }
    console.log("Node ID", nodeID);
    callback(null, nodeID);
}

CoreDb.prototype.deleteScaleAddNode = function (id, callback) {
    var connection = new sql.Connection(this.config, function (err) {
        if (err) { callback(err, null); }

        var request = new sql.Request(connection);
        var q = "DELETE FROM [SaaSGrid Core].[dbo].[AddOnProperty] " +
            "WHERE [Id] = " + id ;

        request.query(q, function (err, recordset) {
            if (err) { callback(err, null); }

            callback(null, recordset);
        });
    });
}

CoreDb.prototype.getDevUtilization = function (callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [developer_alias] as DevTeam " +
			",[allocated_cpu] as CpuAllocated " +
			",[allocated_memory] as MemAllocated " +
			"FROM [SaaSGrid Core].[dbo].[deployed_artifact_details] " +
			"WHERE [developer_alias] != 'apprenda'";

		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getResourcePolicies = function (showInactive, callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT [name] as 'Name' " +
			",[description] as 'Description' " +
			",[memory_limit] as 'MemoryLimit' " +
			",[cpu_limit] as 'CpuLimit' " +
			",[cpu_cores] as 'Cores' " +
			",[type] as 'Type' " +
			",[active] as 'Active' " +
			",[deleted] as 'Deleted' " +
			",[allow_deployment] as 'Deployable' " +
			",[notes] as 'Notes' " +
			"FROM [SaaSGrid Core].[dbo].[resource_allocation_policy] " +
			"WHERE [deleted] = 0";

		if (!showInactive) {
			q += " AND [active] = 1"
		}

		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.getInstanceFromDeployedArtifactId = function (id, callback) {
	var connection = new sql.Connection(this.config, function (err) {
		if (err) { callback(err, null); }

		var request = new sql.Request(connection);
		var q = "SELECT da.InstanceId as instanceId, ah.hostname as 'server', a.name as ArtifactName, v.alias as 'Version', app.alias as 'AppAlias' " +
			"FROM [SaaSGrid Core].[dbo].[Deployed_Artifact] da " +
			"JOIN [SaaSGrid Core].[dbo].Artifact_Host ah on ah.id = da.[host_id] " +
			"JOIN [SaaSGrid Core].[dbo].[Artifacts] a on a.RowId = da.artifact_id " +
			"JOIN [SaaSGrid Core].[dbo].[Version] v on v.Id = a.version_id " +
			"JOIN [SaaSGrid Core].[dbo].[Application] app on app.Id = v.application_id " +
			"WHERE da.Id = " + id;

		request.query(q, function (err, recordset) {
			if (err) { callback(err, null); }

			callback(null, recordset);
		});
	});
}

CoreDb.prototype.findCustomPropertyModel = function(name, callback){
  var connection = new sql.Connection(this.config, function (err) {
    if (err) { callback(err, null); }
    var q = "select * from [SaaSGrid Core].[dbo].[CustomPropertyModel]";
    if (name){
      q = "SELECT [Id] FROM [SaaSGrid Core].[dbo].[CustomPropertyModel] where [Name]='" + name + "'";
    }

    var request = new sql.Request(connection);
    request.query(q, function (err, recordset) {
      if (err) { callback(err, null); }

      callback(null, recordset);
    });
  });
}


CoreDb.prototype.loadScalableProps = function (ids, callback) {
  var connection = new sql.Connection(this.config, function (err) {
    if (err) { callback(err, null); }
    var propReq = new sql.Request(connection);
    var q;
    if (!ids) {
      q = "SELECT cp.[Id], cp.[Name]" +
        " FROM [SaaSGrid Core].[dbo].[CustomPropertyModel] as cp " +
        " where cp.IsSystemProperty=0 " +
        " and cp.SupportedObjectTypes in (1029)";
    }
    else{
      var idstring = "";
      for (var a = 0; a < ids.length; a++){
        if (a == 0){
          idstring += ids[a];
        }
        else{
          idstring += ", " + ids[a];
        }
      }
      q = "SELECT cp.[Id], cp.[Name]" +
        " FROM [SaaSGrid Core].[dbo].[CustomPropertyModel] cp" +
        " where cp.Id in (" + idstring + ")";
    }

    propReq.query(q, function (err, props) {
      if (err)
      {
        callback(err, null);
      }else{
        var custProps = [];
        var modelIDs = "";
          for (var i = 0; i < props.length; i++) {
            var p = {};
            p.id = props[i].Id;
            p.name = props[i].Name;
            custProps.push(p);
            p.vals = {};
            p.vals.length = 0;
            if (i == 0){
              modelIDs += p.id;
            }
            else{
              modelIDs += ", " + p.id;
            }
          }
          if (custProps.length > 0) {
            var request = new sql.Request(connection);
            var q1 = "SELECT DISTINCT " +
              "cp.Name as Name " +
              ",cp.ParentModelId as ParentModelId " +
              ",cp.ReferencedObjectType as ReferencedObjectType " +
              ",cp.ReferencedObjectId as ReferencedObjectId " +
              ",h.hostname as hostname" +
              " FROM [SaaSGrid Core].[dbo].[CustomPropertyViewValuesView] cp inner join [SaaSGrid Core].[dbo].[Artifact_Host] h on " +
              "h.id = cp.ReferencedObjectId " +
              "where cp.ParentModelId in (" + modelIDs + ") and cp.ReferencedObjectType=1";

            request.query(q1, function (err, recordset) {
              if (err) {
                callback(err, null);
              }
              else {
                for (var ii = 0; ii < recordset.length; ii++) {
                  var mId = recordset[ii].ParentModelId;
                  var valName = recordset[ii].Name;
                  var serverName = recordset[ii].hostname;
                  for (var c = 0; c < custProps.length; c++){
                    var cp = custProps[c];
                    if (cp.id == mId){
                      if (!cp.vals[valName]) {
                        cp.vals.length++;
                        cp.vals[valName] = [];
                      }
                      cp.vals[valName].push(serverName);
                      break;
                    }
                  }
                }
                callback(null, custProps);
              }
            });
          }
        else{
            callback(null, custProps);
          }
        }
      });
  });
}

CoreDb.prototype.loadCustomProps = function (ids, callback) {
  var connection = new sql.Connection(this.config, function (err) {
    if (err) { callback(err, null); }
    var propReq = new sql.Request(connection);
    var q;
    if (!ids) {
      q = "SELECT cp.[Id], cp.[Name]" +
        " FROM [SaaSGrid Core].[dbo].[CustomPropertyModel] as cp " +
        " where cp.IsSystemProperty=0 " +
        " and cp.SupportedObjectTypes in (1029)";
    }
    else{
      var idstring = "";
      for (var a = 0; a < ids.length; a++){
        if (a == 0){
          idstring += ids[a];
        }
        else{
          idstring += ", " + ids[a];
        }
      }
      q = "SELECT cp.[Id], cp.[Name]" +
        " FROM [SaaSGrid Core].[dbo].[CustomPropertyModel] cp" +
        " where cp.Id in (" + idstring + ")";

      console.log('query q', q);
    }

    propReq.query(q, function (err, props) {
      if (err)
      {
        callback(err, null);
      }else{
        var custProps = [];
        var customTags  = [];
        var modelIDs = "";
        for (var i = 0; i < props.length; i++) {
          var p = {};
          p.id = props[i].Id;
          p.name = props[i].Name;
          custProps.push(p);
          if (i == 0){
            modelIDs += p.id;
          }
          else{
            modelIDs += ", " + p.id;
          }
        }

        if (custProps.length > 0) {
          var request = new sql.Request(connection);
          var q1 = "SELECT DISTINCT " +
            "cpv.Value as val , cpv.CustomPropertyModelId as modelid" +
            " FROM [SaaSGrid Core].[dbo].[CustomPropertyValues] cpv " +
            "where cpv.CustomPropertyModelId in (" + modelIDs + ")";

          request.query(q1, function (err, recordset) {
            if (err) {
              callback(err, null);
            }
            else {
              for (var ii = 0; ii < recordset.length; ii++) {
                var mId = recordset[ii].modelid;
                var valName = recordset[ii].val;
                for (var c = 0; c < custProps.length; c++){
                  var cp = custProps[c];
                  if (cp.id == mId) {
                    var tagObj = {id: mId, name: cp.name, key: valName, tagKey: cp.name + ":" + valName};
                    customTags.push(tagObj);
                    break;
                  }
                }
              }
              callback(null, customTags);
            }
          });
        }
        else{
          callback(null, customTags);
        }
      }
    });
  });
}

CoreDb.prototype.loadTenants = function (callback) {
  var connection = new sql.Connection(this.config, function (err) {
    if (err) { callback(err, null); }
    var propReq = new sql.Request(connection);
    var q = "SELECT t.[id] as tid, t.[alias] as alias" +
        " FROM [SaaSGrid Core].[dbo].[Tenant] as t " +
        " where t.TenantType=1 and t.alias is not null and t.IsEnabled=1" ;

    propReq.query(q, function (err, recordset) {
      if (err)
      {
        callback(err, null);
      }else{
        var tenants = [];
        for (var ii = 0; ii < recordset.length; ii++) {
          tenants.push({id: recordset[ii].id, alias:recordset[ii].alias});
        }
        callback(null, tenants);
      }
    });
  });
}


CoreDb.prototype.tagServer = function (modelID, serverID, propVal, callback) {
  //Insert into [SaaSGrid Core].[dbo].[CustomProperty]
  //([ParentModelId],[ReferencedObjectId],[ReferencedObjectType],[VersionId],[PropertyValuesRaw])
  //VALUES (41, 21, 1, null, CONVERT(XML,N'<PropertyValues xmlns="Apprenda.SaaSGrid.Persistence"><Values Name="HIPAA" /></PropertyValues>'))

  var connection = new sql.Connection(this.config, function (err) {
    if (err) { callback(err, null); }

    var request = new sql.Request(connection);
    var q =
      "Insert into [SaaSGrid Core].[dbo].[CustomProperty] " +
      "([ParentModelId],[ReferencedObjectId],[ReferencedObjectType],[VersionId],[PropertyValuesRaw]) " +
        "VALUES (" + modelID + ", " + serverID + ", 1, null, CONVERT(XML,N'<PropertyValues xmlns=\"Apprenda.SaaSGrid.Persistence\"><Values Name=\"" +
        propVal + "\" /></PropertyValues>" + "'" + "))";

    request.query(q, function (err, recordset) {
      if (err) { callback(err, null); }

      callback(null, recordset);
    });
  });
}


/****** Script for SelectTopNRows command from SSMS  ******/
//SELECT TOP 1000 [Id]
//	,[Value]
//	,[CustomPropertyId]
//	,[CustomPropertyModelId]
//	,[IsDefault]
//	,[SupportedObjectTypes]
//	,[VersionId]
//	,[ReferencedObjectId]
//FROM [SaaSGrid Core].[dbo].[CustomPropertyValues] where ReferencedObjectId = '8' and SupportedObjectTypes = 1 and Value = 'Yes' and CustomPropertyModelId = 31
module.exports = CoreDb;
