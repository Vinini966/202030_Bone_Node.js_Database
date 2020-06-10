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

//initializes passport
app.use(passport.initialize());
app.use(passport.session());

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
            email:data.email,
            password:data.password,
        });

        console.log(newUser);

        bcrypt.genSalt(10, function(err, salt){
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

    });

    socket.on("CheckLogin", function(data){
        User.findOne({
            user:data.username
        }).then(function(user){
            if(!user){
                socket.emit("ERR", {errCode:2})
                return;
            }
            console.log("user found");
            //compares passwords
            bcrypt.compare(data.password, user.password, function(err, isMatch){
                if(err)throw err;
                if(isMatch){
                    socket.emit("LoginReturn", {
                        result:true
                    })
                    return;
                }
                else{
                    socket.emit("LoginReturn", {
                        result:false
                    })
                    return;
                }
            });
        });
    });

});