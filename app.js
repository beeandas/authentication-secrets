//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption")
const { stringify } = require("querystring");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

mongoose.set("strictQuery", false)
mongoose.connect("mongodb://localhost:27017/userDB",()=>{
    console.log("Connected to mongodb server...")
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

app.get("/", (req,res)=>{
    res.render("home.ejs");
});

app.get("/login", (req,res)=>{
    res.render("login.ejs");
});


app.get("/register", (req,res)=>{
    res.render("register.ejs");
});


app.post("/register", (req,res)=>{

    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save((err)=>{
        if(!err){
            res.render("secrets.ejs");
        }else{
            console.log(err);
        }
    });
});

app.post("/login",(req,res)=>{
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email:username},(err, foundUser)=>{
        if(err){
            console.log(err)
        }else{
            if(foundUser){
                if(foundUser.password === password){
                    res.render("secrets.ejs")
                }
            }
        }
    })
})




app.listen(3000, ()=>{
    console.log("Server Started at port 3000.")
});