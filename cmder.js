//
// Copyright (c) Apprenda, Inc. All rights reserved
//

var cliff = require('cliff'),
	osclient = require('./mods/osdriver');
	program = require('commander');

program
	.version('0.0.1')
	.alias('apprenda utilization');

program
	.command('servers')
	.description('Get List of Servers OpenStack')
	.option('-j, --json', 'Change output to JSON')
	.action(getServers);

program
    .command('testinstall')
    .description('Test Installer')
    .option('-j, --json', 'Change output to JSON')
    .action(testInstall);

program
	.command('testuninstall')
	.description('Test UnInstaller')
	.option('-j, --json', 'Change output to JSON')
	.action(testUninstall);

program
	.command('utilcheck')
	.description('Show total platform utilization')
	.option('-j, --json', 'Change output to JSON')
	.option('-d, --db', 'DB name')
	.action(checkUtilization);

program.parse(process.argv);

function getServers(cmd, options){
	osclient.servers(function(err, result){
		if (err){
			console.log(err);
		}else{
			if (cmd.json){
				console.log("%j", result);
			}else{
				console.log("result", result);
			}
		}
	});
}

function testInstall(cmd, options){
    var scaler = require('./mods/autoscaler');

    scaler.testInstall(function(err, data){
        console.log(err, data);
    });
}

function testUninstall(cmd, options){
    var scaler = require('./mods/autoscaler');

    scaler.testUninstall(function(err, data){
        console.log(err, data);
    });
}


function checkUtilization(cmd, options) {
    var scaler = require('./mods/autoscaler');

    scaler.checkStats("app-sql\\sqlexpress", "sa", "@pp4ever", "auto", function(err, data){
        console.log(err, data);
    });
}


// if nothing was parsed out show help
if (program.args.length === 0) {
	program.parse(['', '', '-h']);
}
