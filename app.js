//jshint esversion:6
// require and configure dotenv environ varaibles
require('dotenv').config();
// default settings
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
// require md5 hash function
const md5 = require("md5");

const app = express();

// set up module
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// connect mongoose
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology:true});
// create mongoose schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


// create mongoose model collection using schema
const User = new mongoose.model("User", userSchema);

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

// catch form post from register route
app.post("/register", function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: md5(req.body.password)
    });
    newUser.save(function(err){
        if (err){
            console.log(err);
        }else{
            res.render("secrets")
        };
    });

});
// catch form post from login route
app.post("/login", function(req, res){
    const username = req.body.username;
    const password = md5(req.body.password);

    // query user collection database
    User.findOne({email:username}, function(err, foundUser){
        if (err){
            console.log(err);
        }else{
            // authenticate users
            if (foundUser){
                if (foundUser.password === password){
                    res.render("secrets");
                };
            };
        };
    });
});

app.listen(3000, function(){
    console.log("server is started at port 3000");
})