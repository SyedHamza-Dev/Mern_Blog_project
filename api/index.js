require('dotenv').config(); // Load environment variables from .env file

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/Users");
const Post = require("./models/Blog-Post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");

const salt = bcrypt.genSaltSync(10);
const secret = process.env.JWT_SECRET; // Use environment variable for secret

const app = express();

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:4000"],
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(process.env.MONGODB_URI, { // Use environment variable for MongoDB URI
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const { token } = req.cookies;
  if (!token) return res.status(401).json("No token provided");

  jwt.verify(token, secret, {}, (err, user) => {
    if (err) return res.status(403).json("Invalid token");
    req.user = user; // Attach user info to the request
    next(); // Proceed to the next middleware or route handler
  });
}

// Registration route
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (error) {
    res.status(400).json(error);
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  if (!userDoc) return res.status(400).json("User not found");

  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    const token = jwt.sign({ username, id: userDoc._id }, secret, { expiresIn: '1h' });
    res.cookie("token", token, { httpOnly: true }).json({
      id: userDoc._id,
      username,
    });
  } else {
    res.status(400).json("Wrong credentials");
  }
});

// Profile route
app.get("/profile", authenticateToken, (req, res) => {
  res.json(req.user);
});

// Logout route
app.post("/logout", (req, res) => {
  res.cookie("token", "", { expires: new Date(0) }).json("ok");
});

// Create Post route
app.post("/post", uploadMiddleware.single("file"), authenticateToken, async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { title, summary, content } = req.body;
  const postDoc = await Post.create({
    title,
    summary,
    content,
    cover: newPath,
    author: req.user.id, // Use authenticated user id
  });

  res.json(postDoc);
});

// Update Post route
app.put("/post", uploadMiddleware.single("file"), authenticateToken, async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { id, title, summary, content } = req.body;
  const postDoc = await Post.findById(id);
  if (!postDoc) return res.status(404).json("Post not found");

  const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(req.user.id);
  if (!isAuthor) {
    return res.status(403).json("You are not the author");
  }

  await postDoc.update({
    title,
    summary,
    content,
    cover: newPath ? newPath : postDoc.cover,
  });

  res.json(postDoc);
});

// Get all posts
app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

// Get single post by ID
app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  if (!postDoc) return res.status(404).json("Post not found");
  res.json(postDoc);
});

// Start server
app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
