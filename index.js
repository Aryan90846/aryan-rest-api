const express = require("express");
const mongoose = require("mongoose");

const app = express();

/* Middleware */
app.use(express.json());

/* MongoDB Connection */
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB connected");
})
.catch((err) => {
  console.log("MongoDB connection error:", err);
});

/* Routes */
app.get("/", (req, res) => {
  res.send("Aryan REST API running 🚀");
});

/* Server */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
