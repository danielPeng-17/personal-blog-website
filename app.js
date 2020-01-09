require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const lodash = require('lodash');
const ejs = require('ejs');

const app = express();
const saltRounds = 10;
let authenticated = false;
let currUser;
let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://"+process.env.DB_CREDENTIALS+"@cluster0-efphu.mongodb.net/test?retryWrites=true&w=majority/personalBlogDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

const postsSchema = {
    title: String,
    text: String,
    url: String
};

const usersSchema = mongoose.Schema({
    username: String,
    password: String,
    posts: [postsSchema]
});

const User = mongoose.model("User", usersSchema);

app.route("/")
    .get(function(req, res){
        User.findOne({}, function(err, result){
            if (result == null){
                res.render("home", { posts: [] });
            }else {
                res.render("home", { posts: result.posts });
            }
        });
    });

app.route("/login")
    .get(function(req, res){
        res.render("login", {userErr: '', passErr: ''});
    })
    .post(function(req, res){
        const user = req.body.username;
        const pass = req.body.password;

        // check user log in credentials using bcrypt
        User.findOne({username: user}, function(err, result){
            if (err || result == null){
                console.log(err);
                res.render("login", {userErr: 'Invalid Username', passErr: ''});
            }else if (result != null) {
                bcrypt.compare(pass, result.password, function(err, valid){
                    console.log(valid);
                    if (valid){
                        currUser = user;
                        authenticated = true;
                        res.redirect("/compose");
                    }else {
                        res.render("login", {userErr: '', passErr: "Invalid Password"});
                    }
                });
            }
        });
    });

app.route("/register")
    .get(function(req, res){
        res.render("register", {err: ''})
    })
    .post(function(req, res){
        const newUsername = req.body.username;
        const newPassword = req.body.password;
        const newConfirmPassword = req.body.confirmPassword;

        // check if the confirmed pass is the same as the orignal pass
        // if not then re-render the same page with a err message
        if (newConfirmPassword === newPassword){
            // hash password with bcrypt before saving it into db
            bcrypt.hash(newPassword, saltRounds, function(err, hash){
                const newUser = new User({
                    username: newUsername,
                    password: hash,
                    posts: []
                });
    
                newUser.save();
                res.redirect("/compose");
            });
        }else {
            res.render("register", {err: "Passwords Do Not Match"})
        }        
    });

app.route("/compose")
    .get(function(req, res){
        if (authenticated){
            res.render("compose", { username: currUser });
        }else {
            res.redirect("/login");
        }
    })
    .post(function(req, res){
        const newTitle = req.body.title;
        const newText = req.body.text;
        const newURL = lodash.kebabCase(newTitle)

        console.log(newTitle);
        console.log(newText);
        console.log(newURL);

        const newEntry = {
            title: newTitle,
            text: newText,
            url: newURL
        }

        // add the new blog post into my posts array on the db
        User.findOne({username: currUser}, function(err, result){
            if (err){
                console.log(err);
            }else {
                result.posts.push(newEntry);
                result.save();
                authenticated = false;
                currUser = null;
                res.redirect("/");
            }
        });
        
    });

app.get("/posts/:postName", function(req, res){
    const postName = req.params.postName;

    User.findOne({}, function(err, result){
        const blogs = result.posts;

        // find the correct blog post to send
        for (let i = 0; i < blogs.length; i++){
            if (blogs[i].url === postName){
                const post = blogs[i];
                res.render("post", {title: post.title, text: post.text});
            }
        }
    });
});

app.post("/logout", function(req, res){
    authenticated = false;
    currUser = null;
    res.redirect("/");
});

app.listen(port, function(){
    console.log(`Server started on port ${port}`);
});