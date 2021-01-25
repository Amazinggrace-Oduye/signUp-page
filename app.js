//jshint esversion:6
// require and configure dotenv environ varaibles
require('dotenv').config();
// default settings
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require('express-session');
const passport = require("passport");
const passportLocaleMongoose = require("passport-local-mongoose");


const app = express();

// set up module
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// set up express-session initial configuration
app.use(session({
    secret: 'our little secret.',
    resave: false,
    saveUninitialized: true
}));
// initialize passport to set up for authentication use
app.use(passport.initialize());
// use passport to set up persistent login  session
app.use(passport.session());

// connect mongoose
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology:true});
mongoose.set('useCreateIndex', true)
// create mongoose schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
// plugin passport local mongoose to user schema
// for hash and salting by passport and others
userSchema.plugin(passportLocaleMongoose);

// create mongoose model collection using schema
const User = new mongoose.model("User", userSchema);
// configure password local
// create cookies using serialize
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// read route
app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});
// render secret page if user is authenticated
app.get("/secrets", function(req, res){
    if (req.isAuthenticated){
        res.render("secrets");
    }else{
        res.redirect("/login");
    };
});

// catch log out route
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})
// catch form post to register route
app.post("/register", function(req, res){
    // use register a new user to database
    User.register({username:req.body.username}, req.body.password, function(err, user){
        if (err){
            console.log(err);
            res.redirect("/register")
        }else{
            // authentiacte user with local type of authentication
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
          })  
        }
    }) 
});
// catch form post from login route
app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    // authenticate login user if the credentials alredy exist in database
    //  
    req.login(user, function(err){
        if (err){
            console.log(err);
        }else{
            // the code below set up cookies 
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
        };
    });
   
});

app.listen(3000, function(){
    console.log("server is started at port 3000");
})