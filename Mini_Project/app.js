const express = require("express");
const app = express();
const path = require('path');
const userModel = require("./models/user");
const cookieParser = require("cookie-parser"); 
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const postModel=require("./models/post")

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 

app.get('/', (req, res) => {
    res.render("index");
});

app.post('/register',async (req,res)=>{
    let{email,password,username,name,age}=req.body
    let user=await userModel.findOne({email});
    if(user)return res.status(500).send("user already registered")


    bcrypt.genSalt(10,(err,salt)=>{
    bcrypt.hash(password,salt,async (err,hash)=>{
      let user=  await userModel.create({
            username,
            email,
            age,
            name,
            password:hash
        });
       let token=jwt.sign({email:email,userid:user._id},"shhh")
       res.cookie("token",token)
       res.send("registered")
    })
})
});
app.get('/login',async (req,res)=>{
    res.render("login")
});
app.get('/profile',isLoggedIn,async (req,res)=>{
    let user=await userModel.findOne({email:req.user.email}).populate("posts")
    // console.log(name)
    res.render("profile",{user})
})
app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (!user) return res.status(404).send("User not found");

    // Compare the password
    bcrypt.compare(password, user.password, function (err, result) {
        if (err) return res.status(500).send("Error comparing passwords");
        if (result) {
            let token = jwt.sign({ email: user.email, userid: user._id }, "shhh");
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        } else {
            // Password mismatch
            res.status(401).send("Invalid password");
        }
    });
});
app.post('/post',isLoggedIn,async(req,res)=>{
    let user=await userModel.findOne({email:req.user.email})
    let {content}=req.body;
    let post=await postModel.create({
        user:user._id,
        content
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect("/profile")
})
app.get('/logout',(req,res)=>{
    res.cookie("token","")
    res.redirect("/login")
})


// middle ware for checking if the user is logged in 
function isLoggedIn(req, res, next) {
    if(req.cookies.token==="")res.redirect("/login");
    else{
    //   if there is cookie then jwt will verify with the secret key and we will get the user data and we will set it to req.user=data
      let data=  jwt.verify(req.cookies.token,"shhh")
      req.user=data
      next()
    }
}


app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
