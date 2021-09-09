const express = require('express')
const router = express.Router(); //me permite crear rutas
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/Users');
const passport = require('passport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
var countriesList = require('countries-list');

//console.log(countriesList.countries);


const cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_cloud_name,
  api_key: process.env.CLOUDINARY_api_key,
  api_secret: process.env.CLOUDINARY_api_secret
});
const fs = require('fs-extra'); // permite borrar archivos



router.get('/users/signin', (req, res) => {
  if(typeof req.user === 'undefined'){
    res.render('users/signin');
  }else{
    res.redirect('/');
  }
})

router.post('/users/signin', passport.authenticate('local', {
  successRedirect: '/questions/allquestions',
  failureRedirect: '/users/signin',
  failureFlash: true
}));

//por defecto passport tiene las variable local
router.get('/users/signup', (req, res) => {
  
  if(typeof req.user === 'undefined'){
    res.render('users/signup');
  }else{
    res.redirect('/');
  }
});

router.post('/users/signup', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const errors = [];
  if (name.length <= 0) {
    errors.push({ text: 'Please Insert your Name' })
  }
  if (password != confirmPassword) {
    errors.push({ text: 'Password do not match' });
  }
  if (password.length <= 4) {
    errors.push({ text: 'Password must be at least 4 characters' })
  }
  if (errors.length > 0) {
    res.render('users/signup', { errors, name, email, password, confirmPassword })
  } else {

    const emailUser = await User.findOne({ email: email });
    if (emailUser != null) {
      errors.push({ text: 'Email is already used' });
      res.render('users/signup', { errors, name, email, password, confirmPassword })
    } else {
      const newUser = new User({ name, email, password });
       newUser.password = await newUser.encryptPassword(password);
      await newUser.save();
      req.flash('success_msg', 'You are registered');
      res.redirect('/users/signin');
    }
  }
})

router.get('/users/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

router.get('/users/myprofile', async (req, res) => {

  const user = await User.findById(req.user.id).lean()
    .then(data => {
      return {
        name: data.name,
        email: data.email,
        imageProfileUrl: data.imageProfileUrl,
        public_ImageId: data.public_ImageId,
        ranking: data.ranking,
        short_describe: data.short_describe,
        experience_describe: data.experience_describe,
        country_birth: data.country_birth
      }
    })
  res.render('users/myprofile', { user, countriesList: countriesList.countries });
});

router.put('/users/myprofile', isAuthenticated, async (req, res) => {
  const { name, email, short_describe, experience_describe} = req.body;
  const country_birth = req.body.country_birth;

  if (typeof req.file !== 'undefined' && typeof req.file.path !== 'undefined' && req.file.path) {
    const result = await cloudinary.v2.uploader.upload(req.file.path);
    const imageProfileUrl = result.url;
    const public_ImageId = result.public_id;
    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const query = { _id: idparamsObjectTypeID };
    await User.findOneAndUpdate(query, { name: name, email: email, imageProfileUrl: imageProfileUrl, public_ImageId: public_ImageId, short_describe: short_describe, experience_describe: experience_describe, country_birth:  country_birth });
    await fs.unlink(req.file.path);
  } else {
    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const query = { _id: idparamsObjectTypeID };
    await User.findOneAndUpdate(query, { name: name, email: email, short_describe: short_describe, experience_describe: experience_describe, country_birth: country_birth });
  }

  req.flash('success_msg', 'Note Updated Successfully');
  res.redirect('/users/myprofile');

})

router.get('/users/newpassword', isAuthenticated, (req, res) => {
  res.render('users/new-password');
});

router.put('/users/newpassword', isAuthenticated, async (req, res) => {
  const { currentpassword, newpassword, confirmpassword } = req.body;
  const errors = [];

  if (newpassword != confirmpassword) {
    errors.push({ text: 'Password do not match' });
  }
  if (newpassword.length <= 10) {
    errors.push({ text: 'Password must be at least 10 characters' })
  }
  if (errors.length > 0) {
    res.render('users/new-password', { errors, newpassword, confirmpassword })
  } else {

    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const user = await User.findOne({ _id: idparamsObjectTypeID });
    const matchCurrentPass = await user.matchPassword(currentpassword);
    const newPassEncrypted = await user.encryptPassword(newpassword);

    if (matchCurrentPass) {
      const query = { _id: idparamsObjectTypeID };
      console.log("entro");
      await User.findByIdAndUpdate(req.user.id, { password: newPassEncrypted });
    }

    req.flash('success_msg', 'Password Updated Successfully');
    res.redirect('/users/myprofile');
  }
})

module.exports = router;