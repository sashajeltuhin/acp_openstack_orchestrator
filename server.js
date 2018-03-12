var http = require('http');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var methodOverride = require('method-override');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');
var oscloud = require('./mods/osdriver');
var slcloud = require('./mods/softlayerdriver');
var scaler = require('./mods/autoscaler');
var driver = require('./mods/installdriver');
var mailer = require('./mods/mailer');
var ucsm = require('./mods/ucsmdriver');
var ucsd = require('./mods/ucsddriver');
var apprenda = require('./mods/appdevdriver');
var jenk = require('./mods/jenkinsdriver');
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var fileup = require('./mods/upload');
//var passport = require('passport');

var app = express();

app.on('close', function () {

});


app.set('port', process.env.PORT || 8024);
app.set('jsonp callback', true );
app.use(logger('dev'));
app.use(cookieParser());
app.use(session({ resave: true,
    saveUninitialized: true,
    secret: '@ppr3nd@' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());

//app.use(passport.initialize());
//app.use(passport.session());

//app.use(express.static(path.join(__dirname, 'app')));

//auth
//passport.use(auth.localStrategy);
//passport.serializeUser( auth.serializeUser);
//passport.deserializeUser( auth.deserializeUser);

//app.get('/', function(req, res){
//  res.sendfile(path.join(__dirname + '/index.html'));
//});

app.get('/hb/listservers/:env', oscloud.listServers);
app.get('/hb/listflavors/:env', oscloud.listFlavors);
app.get('/hb/listimages/:env', oscloud.listImages);
app.get('/hb/listnetworks/:env', oscloud.listNetworks);
app.get('/hb/addserver', oscloud.addServer);
app.get('/hb/deleteserver/:id', oscloud.deleteServer);
app.get('/hb/addvm/:type', oscloud.addVM);
app.get('/hb/addneutronvm/:type/:env/:sname/:imageRef/:flavorRef/:netid/:url', oscloud.addNeutronVM);
app.get('/hb/exec/:env/:id/:action/:type', oscloud.execAction);
app.get('/hb/orchestrate/:uname/:upass/:spass/:type/:name/:image/:flavor/:sec/:key/:tid/:novaurl/:authurl/:networkid/:options/:clength', oscloud.orchestrate);
app.get('/hb/deletevm/:id/:uname/:upass/:tid/:novaurl/:authurl/:clength', oscloud.deleteVM);
app.get('/hb/testsoft', slcloud.testCreate);
app.get('/hb/testio', slcloud.testSaveFile);

app.get('/hb/mail/:smtp/:port/:uname/:upass', mailer.testMailer);

app.get('/ucsm/auth/:uname/:pw/:url', ucsm.testAuth);
app.get('/ucsm/list/:uname/:pw/:url/:objname', ucsm.listObj);
app.get('/ucsm/detail/:uname/:pw/:url/:objname', ucsm.getObjInfo);
app.get('/ucsm/addservice/:uname/:pw/:url/:objname/:sname', ucsm.addSP);

app.get('/ucsd/get/:key/:url/:oper', ucsd.testGet);

app.get('/app/testauth/:url/:user/:pass/:tenant/:app', apprenda.testAppSession);
app.get('/app/listApps/:url/:user/:pass/:tenant/:app', apprenda.loadApps);
app.get('/app/deleteApp/:url/:user/:pass/:tenant/:app', apprenda.deleteApp);
app.get('/app/addApp/:url/:user/:pass/:tenant/:app', apprenda.createApp);
app.get('/app/changeNodeState/:url/:user/:pass/:node/:state', apprenda.changeNodeState);

app.get('/ci/testBuild/:url/:user/:usertoken/:jobname/:jobtoken', jenk.testJenk);


app.get('/os/listobjects/:url/:tid/:uname/:pass/:objname/:ssl', oscloud.listObjects);

app.post('/api/orch', driver.orchestrate);
app.get('/api/addondone/:addon/:serverName/:ip/:os/:emails', driver.addonInstalled);

app.post('/ci/checkiaas', scaler.ensureCapacity);
app.post('/ci/cleanup', scaler.wipeUnused);
app.post('/api/detectAPIVersions', driver.detectAPIVersions);
app.post('/api/signin', apprenda.signin);
app.post('/api/getsettings', scaler.getsettings);
app.post('/api/savesettings', scaler.savesettings);
app.get('/api/getcachedenv/:key', driver.loadCachedEnv);
app.post('/api/gentemplate', driver.getNodeTemplate);
app.post('/api/initenv', driver.initEnv);
app.post('/api/getobjdetail', driver.listObjDetail);
app.post('/api/installemailsettings', driver.installemailsettings);
app.get('/api/loadinstallermail', driver.loadinstallermail);
app.post('/api/buildvm', driver.buildVM);
app.post('/api/buildinfra', driver.buildInfra);
app.post('/api/buildfromseed', driver.buildInfraFromSeed);
app.post('/api/buildSeedTemplate', driver.buildSeedTemplate);
app.get('/api/vmdone/:sname/:extIP/:localIP/:role/:jobid', driver.vmbuilt);
app.post('/api/kickoff', driver.installPlatform);
app.post('/api/updateprogress', driver.updateRemoteProgress);
app.get('/api/completelm', driver.completeLMinstall);
app.get('/api/jobstatus/:key', driver.getjobstatus);
app.get('/api/listjobs', driver.listJobs);
app.get('/api/loadAutoSettings', driver.loadAutoSettings);
app.post('/api/killjob', driver.stopJob);
app.post('/api/addnode', scaler.addNode);
app.post('/api/registerjob', driver.registerjob);
app.post('/api/updatemodel', driver.updatemodel);
app.post('/api/loadCustomProps', scaler.loadCustomProps);
app.post('/api/loadTenants', scaler.loadTenants);
app.post('/api/getstats', scaler.getstats);
app.post('/api/deletenode', scaler.deleteNode);
app.post('/api/toggleService', scaler.toggleService);
app.post('/api/proxyJobDone', scaler.proxyJobDone);
app.post('/api/updateServerState', scaler.updateServerState);
app.post('/api/deleteProgressNode', scaler.deleteProgressNode);
app.post('/api/installapp', driver.installApp);

app.post('/api/uploadLic', upload.single('lic'), fileup.saveLic);

app.use(function(err, req, res, next){
    console.log(err);
    res.status(500).send({ error: err });
});

app.on('close', function () {
  if ( global.db !== undefined){
    for(var key in  global.db){
      global.db[key].close();
    }
  }
});

var server = http.createServer(app);
var io = require('socket.io')(server);
server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});

var chat = require('./mods/feedback').init(io);
