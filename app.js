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
// require goole and facebook strategy 
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate')


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
// with google id
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    googleName: String,
    facebookId: String,
    facebookName: String,
    secret: String
});
// plugin passport local mongoose and findOreCreate to user schema
// for hash and salting by passport and others
userSchema.plugin(passportLocaleMongoose);
userSchema.plugin(findOrCreate);

// create mongoose model collection using schema
const User = new mongoose.model("User", userSchema);

// create cookies-session using serialize
// and deserialize with any strategy
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
// ////////////////////////////Google/////////////////////////////////////
// confiqure google strategy using passport and google oauth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
    // return permission rigth to user profile
    // find or create user on User collection database 
  function(accessToken, refreshToken, profile, cb) {
    //   console.log(profile);
      User.findOrCreate({ googleId: profile.id, googleName: profile.displayName }, function (err, user) {
        return cb(err, user);
    });
  }
));
//////////////////////////Facebook///////////////////////////////////////
// confiqure facebook strategy using passport-facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ facebookId: profile.id, facebookName: profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));

// read or render home route
app.get("/", function(req, res){
    res.render("home");
});

// ////////////////////////////Google/////////////////////////////////////
// request made to google to authenticate user using passport
//  and google strategy and return user profile details
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

// request by google to render the app url
app.get("/auth/google/secrets", 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
    // Successful authentication, redirect home.
        res.redirect("/secrets");
});
//////////////////////////Facebook///////////////////////////////////////
// request made to facebook to authenticate user using passport
//  facebook strategy and return user profile details
app.get('/auth/facebook',
  passport.authenticate('facebook'));

// request by facebook to render the app url
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});
// render secret page if user is authenticated
app.get("/secrets", function(req, res){
    // query object document in database were the content in secret is not null
   User.find({"secret": {$ne:null}}, function(err, foundUsers){
       if (err){
           console.log(err);
       }else{
           if (foundUsers){
               res.render("secrets", {userWithSecret: foundUsers});
           };
       };
   });
});
// render secret post if user is authenticate
app.get("/submit", function(req, res){
    if (req.isAuthenticated){
        res.render("submit");
    }else{
        res.redirect("/login");
    };
});

// catch log out route
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});
// catch form post to register route
app.post("/register", function(req, res){
    // use register a new user to database
    User.register({username:req.body.username}, req.body.password, function(err, user){
        if (err){
            console.log(err);
            res.redirect("/register")
        }else{
            // authentiacte user using local strategy
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
            // // authentiacte user using local strategy 
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
        };
    });
});
app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    // find a particuler user by id provided by pasport-strategy in database
    console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser){
        if (err){
            console.log(err);
        }else{
            if (foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            };
        };
    });  
});

app.listen(3000, function(){
    console.log("server is started at port 3000");
})