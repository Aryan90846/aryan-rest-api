const User = require("../models/User");

exports.createUser = async (req,res)=>{
  const user = new User(req.body);
  await user.save();
  res.json(user);
};

exports.getUsers = async (req,res)=>{
  const users = await User.find();
  res.json(users);
};

exports.updateUser = async (req,res)=>{
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {new:true});
  res.json(user);
};

exports.deleteUser = async (req,res)=>{
  await User.findByIdAndDelete(req.params.id);
  res.json({message:"User deleted"});
};
