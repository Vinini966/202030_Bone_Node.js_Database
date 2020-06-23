var express = require('express');
var app = express();
var exphbs  = require('express-handlebars');
var methodOverride = require('method-override');
var session = require('express-session');
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var passport = require('passport');
var mongoose = require('mongoose');
var db = require('./helper/database');
var bcrypt = require('bcryptjs');
var nodemailer = require("nodemailer");


//load passport
//require('./config/passport')(passport);

var dbConnError = false;

//connect to mongoose
mongoose.connect(db.mongoURI ,{
    useNewUrlParser:true,
    useUnifiedTopology:true
}).then(function(){
    console.log('mongodb connected');
}).catch(function(err){
    dbConnError = true;
    console.log(err);
});

//Database schemas
require('./models/User');
var User = mongoose.model('usernames');
//Database schemas
require('./models/Game');
var Game = mongoose.model('playerdata');




//require method override
app.use(methodOverride('_method'));


app.use(express.static('views/images'));

//this code sets up template engine as express handlebars
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

// create application/json parser
app.use(bodyParser.json());
 // create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({ extended: false }));

//express session
app.use(session({
    secret:'secret',
    resave:true,
    saveUninitialized:true
}));

//Setup for flash messaging
app.use(flash());

//Global Variables for flash messaging
app.use(function(req,res,next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

app.get('/', function(req, res){
    res.render("main");
});

app.get('/register', function(req, res){
    res.render("register");
});

app.post('/register', function(req, res){
    //register stuff
    var errors = [];

    if(req.body.password != req.body.password2){
        errors.push({text:"Passwords do not match."});
    }
    if(req.body.password.length < 4){
        errors.push({text:"Password is fewer than 4 characters."});
    }
    if(errors.length > 0){
        res.render('users/register',{
            errors:errors,
            name:req.body.name,
            email:req.body.email,
            password:req.body.password,
            password2:req.body.password2
        });
    }else{
        var newUser = new User({
            user:req.body.name,
            email:req.body.email,
            password:req.body.password,
        });

        User.findOne({ //check for user if duplicate send error
            user:newUser.user
        }).then(function(user){
            if(!user){

                bcrypt.genSalt(10, function(err, salt){
                    bcrypt.hash(newUser.password, salt, function(err, hash){
                        if(err)throw err;
                        newUser.password = hash;
                        newUser.save().then(function(user){
                            res.redirect('/');
                        }).catch(function(err){
                            console.log(err);
                            errors.push({err:err});
                            res.render('/',{
                                errors:errors,
                            });
                            return;
                        });
                    });
                });

            }
            else{
                errors.push({text:"Username is already in use."});
                res.render('users/register',{
                    errors:errors,
                    name:req.body.name,
                    email:req.body.email,
                    password:req.body.password,
                    password2:req.body.password2
                });
            }
        })
        
        

        
    }
});

const PORT = process.env.PORT || 3000

var server = app.listen(PORT, function(){
  console.log("Server started on port " + PORT);
});


var io = require('socket.io').listen(server);


io.on('connection', function(socket){

    console.log("Incomming Connection...");

    socket.emit('handshake');

    socket.on('CreateNewAccount', function(data){
        var newUser = new User({
            user: data.username,
            email: data.email,
            password: data.password,
        });

        User.findOne({ //check for user if duplicate send error
            user:newUser.user
        }).then(function(user){
            if(!user){

                bcrypt.genSalt(10, function(err, salt){//encrypt password
                    bcrypt.hash(newUser.password, salt, function(err, hash){
                        
                        if(err)throw err;
                        newUser.password = hash;
                        newUser.save().then(function(user){
                            socket.emit('NewAccountConfirmation')
                        }).catch(function(err){
                            socket.emit("ERR", {errCode:1})
                            console.log(err);
                            return;
                        });
                    });
                });

            }
            else{
                socket.emit("ERR", {errCode:3})
            }
        })



        

    });

    socket.on("CheckLogin", function(data){
        console.log(data.username);
        console.log(data.password);
        User.findOne({
            user:data.username
        }).then(function(user){
            console.log(user);
            if(!user){
                socket.emit("ERR", {errCode:2})
                return;
            }
            console.log("user found");
            //compares passwords
            bcrypt.compare(data.password, user.password, function(err, isMatch){
                if(err)throw err;
                if(isMatch){
                    console.log(true);
                    socket.emit("LoginReturn", {
                        result:true
                    })
                    return;
                }
                else{
                    console.log(false);
                    socket.emit("LoginReturn", {
                        result:false
                    })
                    return;
                }
            });
        });
    });

    socket.on("RequestPassword", function(data){
        User.findOne({
            user:data.username
        }).then(function(user){
            
        });
    });

    socket.on("SetPlayerData", function(data){
        Game.findOne({
            user:data.username
        }).then(function(user){
            if(!user){
                var newUserData = new Game({
                    savedata: data.lump,
                    user: data.username
                });

                newUserData.save().then(function(user){
                    socket.emit("PlayerDataConfirmation");
                });
            }
            else{
                
                user.savedata = data.lump;

                user.save().then(function(callback){
                    socket.emit("PlayerDataConfirmation");
                });
            }

        });
    })

    socket.on("GetPlayerData", function(data){
        Game.findOne({
            user:data.username
        }).then(function(user){
            if(!user){
                socket.emit("ERR", {errCode:2})
                return;
            }
            else{
                console.log("Sending Player Data");
                socket.emit("PlayerDataReturn", user);
            }
        });
    });

});