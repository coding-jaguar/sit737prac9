const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const cors = require("cors");

const app = express();
app.use(cors()); // allows all origins (dev only!)
app.use(express.json());

// MongoDB connection
const uri =
  process.env.MONGO_URI || "mongodb://mongouser:mongopass@mongo:27017";
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post("/users", async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.json(user);
});

app.put("/users/:id", async (req, res) => {
  const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
});

app.delete("/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
});

app.listen(3000, () => console.log("Express app running on port 3000"));
