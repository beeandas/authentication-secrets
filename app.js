//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const { stringify } = require("querystring");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false)
mongoose.connect("mongodb://localhost:27017/userDB",()=>{
    console.log("Connected to mongodb server...")
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password']});
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req,res)=>{
    res.render("home.ejs");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.get("/login", (req,res)=>{
    res.render("login.ejs");
});


app.get("/register", (req,res)=>{
    res.render("register.ejs");
});

app.get("/secrets", (req,res)=>{
    // if(req.isAuthenticated()){
    //     res.render('secrets.ejs');
    // }else{
    //     res.redirect("/login");
    // }
    User.find({"secret": {$ne:null}}, (err, foundUsers)=>{
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets", {usersWithSecrets: foundUsers})
            }
        }
    });
});

app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        res.render('submit.ejs');
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",(req,res)=>{
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err,foundUser)=>{
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(()=>{
                    res.redirect("/secrets")
                })
            }
        }
    });
});


app.get("/logout", (req,res)=>{
    req.logout(function(err) {
        if (err) { 
            return next(err); 
        }
    });
    res.redirect("/");
});


app.post("/register", (req,res)=>{

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
      
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    
    //     newUser.save((err)=>{
    //         if(!err){
    //             res.render("secrets.ejs");
    //         }else{
    //             console.log(err);
    //         }
    //     });
    // });


    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        }else(
            passport.authenticate("local")(req,res, ()=>{
                res.redirect("/secrets")
            })
        )
    })
});

app.post("/login",(req,res)=>{
    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({email:username},(err, foundUser)=>{
    //     if(err){
    //         console.log(err)
    //     }else{
    //         if(foundUser){
    //             // if(foundUser.password === password){
    //             //     res.render("secrets.ejs")
    //             // }
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                 // result == true
    //                 if(result === true){
    //                     res.render("secrets.ejs")
    //                 }
    //             });
    //         }
    //     }
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err)=>{
        if(err){
            console.log(err)
        }else{
            passport.authenticate("local")(req,res, ()=>{
                res.redirect("/secrets")
            })
        }
    })
});




app.listen(3000, ()=>{
    console.log("Server Started at port 3000.")
});