const express = require("express");
const app = express();
const path = require('path');
const userModel = require("./models/user");
const cookieParser = require("cookie-parser"); 
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const postModel=require("./models/post")
const multerconfig=require('./config/multerconfig')

app.use(express.static(path.join(__dirname,"public")))
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

    // hashing the password
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
       res.redirect("/login")
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
app.post('/loggedIn', async (req, res) => {
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
app.get('/like/:id', isLoggedIn, async (req, res) => {
    try {
        console.log("Received Post ID:", req.params.id);

        let post = await postModel.findOne({ _id: req.params.id }).populate("user");

        if (!post) {
            return res.status(404).send("Post not found");
        }

        console.log("Post found:", post);
        if (post.likes.indexOf(req.user.userid) === -1) {
            post.likes.push(req.user.userid);
        } else {
            post.likes.splice(post.likes.indexOf(req.user.userid), 1);
        }

        await post.save();
        res.redirect("/profile");
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.get('/edit/:id', isLoggedIn, async (req, res) => {
    console.log("Received Post ID:", req.params.id);
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    if (!post) {
        return res.status(404).send("Post not found");
    }
    res.render("edit", { post, user: post.user });
});


app.post('/update/:id',isLoggedIn,async(req,res)=>{
    let post=await postModel.findOneAndUpdate({_id: req.params.id },{content:req.body.content})
    res.redirect("/profile")
})

app.get("/profile/upload", (req, res) => {
    res.render("profileupload");
  });
  

//   from the form we took the post method , upload.singe(name of the value from where it is taken)
  app.post("/upload", isLoggedIn,multerconfig.single("image"), async (req, res) => {
      let user=  await userModel.findOne({email:req.user.email});
       user.profilepic=req.file.filename;
       await user.save()
       res.redirect('/profile')
  });

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
