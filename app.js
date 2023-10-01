    require("dotenv").config();
    const express=require("express");
    const bodyParser=require("body-parser");
    const mongoose=require("mongoose");
    const ejs=require("ejs");
    const session = require('express-session');
    const passport=require("passport");
    const passportLocalMongoose=require("passport-local-mongoose");
    const GoogleStrategy = require('passport-google-oauth20').Strategy;
    const findOrCreate = require('mongoose-findorcreate');

    const app=express();

    app.use(express.static("public"));
    app.set("view engine","ejs");
    app.use(bodyParser.urlencoded({extended:true}));

    //how to use express-session ???
    app.use(session({
    secret: 'our secret',
    resave: false,
    saveUninitialized: false
    }))

    //use passport.js 
    app.use(passport.initialize());
    app.use(passport.session());

    mongoose.connect("mongodb://127.0.0.1:27017/usersDB?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.3");

    const userSchema=new mongoose.Schema({
        email:String,
        password:String,
        googleId:String,
        secret:String,
        username:String
    });
                                                              

//hash and salt our password and save to our db
    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);

    const User= new  mongoose.model("User",userSchema);

    passport.use(User.createStrategy());            //Simplified Passport/Passport-Local Configuration

    passport.serializeUser(function(user, cb) {    //works with any kind of authentication
        process.nextTick(function() {
        cb(null, { id: user.id, username: user.username });
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
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
    },function(accessToken, refreshToken, profile, cb) {
        //console.log(profile);
        User.findOrCreate({ googleId: profile.id,username:profile.displayName}, function (err, user) {
        return cb(err, user);
        });
    }
    ));

    app.get("/",(req,res)=>{
    res.render("home");
    })
    
    app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));
    
    app.get('/auth/google/secrets', passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
    });

    app.get("/login",(req,res)=>{
        res.render("login"); 
    })
    
    app.get("/register",(req,res)=>{
        res.render("register");
    })

    app.get("/secrets", async (req, res) => {
        try {
            const foundUsers = await User.find({ "secret": { $ne: null } });
    
            if (foundUsers && foundUsers.length > 0) {
                res.render("secrets", { userwithSecrets: foundUsers });
            } else {
                res.render("noSecrets");
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
        }
    });
    
    app.get("/logout",(req,res)=>{
        req.logout(function(err) {
            if (err) { return next(err); }
            res.redirect('/');
        })
        });
    app.get("/submit",(req,res)=>{
        if(req.isAuthenticated()){
            res.render("submit");
        }else
        res.redirect("/login");
    })

    app.post("/submit", async (req, res) => {
        const submittedSecret = req.body.secret;        
        try {
          const foundUser = await User.findById(req.user.id);          
          if (foundUser) {
            foundUser.secret = submittedSecret;
            await foundUser.save();
            res.redirect("/secrets");
          } else {
            res.status(404).send("User not found");
          }
        } catch (err) {
          console.error(err);
          res.status(500).send("Internal Server Error");
        }
      });
      

    app.post("/register", (req, res) => {                                                                           
        User.register({username:req.body.username}, req.body.password, function(err, user) {
            if (err) { 
                console.log(err);
                res.redirect("/register");
            }else{
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
                })
            }
        })

    });

    app.post("/login",(req,res)=>{       
        const user= new User({
            username:req.body.username,
            password:req.body.password
        });
        req.login(user,(err)=>{
            if(err){
                console.log(err);
            }else{
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
            })
        }
    })
    }); 

    app.listen(3000,()=>{
        console.log("Server running at PORT 3000");
    })




//-----------COMMENTS----------------
// const encrypt=require("mongoose-encryption");
// const md5=require("md5");
//Hashing and Salting
// const bcrypt=require("bcrypt");
// const saltRounds=10;


// //LEVEL-2 encryption with env 
//mongoose-encryption happens here after calling save()
////mongoose-decryption happens here after calling findOne()
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});




//inside /register (post)
// //LEVEL 3&4 HASHING AND SALTING passwords
// bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {  

        //     const newUser = new User({
        //         email: req.body.username,
        //         password: hash
        //     });
        //     try {           
        //         await newUser.save();
        //         res.render("secrets");
        //     } catch (err) {
        //         console.error(err);
            
        //     }
        // })    
                                                                                                    








//inside /login (post)
// const username=req.body.username;
// const password=req.body.password;
// try{        
// const foundUser=await User.findOne({email:username});

// if(foundUser){
//     bcrypt.compare(password, foundUser.password, function(err, result) {
//         if(result === true){
//         res.render("secrets");
//         }                
//       });

//     }   
//    } 
// catch(err){
// console.error(err);
//   }