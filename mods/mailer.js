var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');


function send(subject, from, to, msg, host, port, admin, upass, sms, callback){
    var transporter = nodemailer.createTransport(smtpTransport({
        host: host,
        port: port,
        secure: false,
        auth: {
            user: admin,
            pass: upass
        }
    }));

    if (!port){
        transporter.port = 25;
    }



    var mailOptions = {
        from: from,
        to: to,
        subject: subject
    }

    if (sms == true){
        mailOptions.text = msg;
    }
    else{
        mailOptions.html = msg;
    }


    transporter.sendMail(mailOptions, function(error, response){
        console.log("sendMail", error, response);
        if(error){
            callback(error, null);
        }else{
            callback(null, response.message);
        }


    });

}

exports.sendMail = function(subject, from, to, msg, host, port, admin, upass, sms, callback){
    send(subject, from, to, msg, host, port, admin, upass, sms, callback);
}

exports.testMailer = function(req, res, next){
    var uname = req.params.uname;
    var pass = req.params.upass;
    var smtp = req.params.smtp;
    var port = req.params.port;

    send("Scale-out Complete", "donotreply@notify.apprenda.com", "sjeltuhin@apprenda.com", "Test", smtp, port, uname, pass, false, function(err, r){
        console.log("Mailed", err, r);
        if (err){
            next(err);
        }
        else{
            res.send("ok");
        }
    });
}