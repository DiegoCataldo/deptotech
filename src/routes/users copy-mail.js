const express = require('express')
const router = express.Router(); //me permite crear rutas
const {isAuthenticated} = require('../helpers/auth');
const User = require('../models/Users');
const passport = require('passport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_cloud_name, 
  api_key: process.env.CLOUDINARY_api_key, 
  api_secret: process.env. CLOUDINARY_api_secret
});
const fs = require('fs-extra'); // permite borrar archivos



router.get('/users/signin', (req, res) => {
  res.render('users/signin');
})

router.post('/users/signin', passport.authenticate('local', {
  successRedirect: '/questions/allquestions',
  failureRedirect: '/users/signin',
  failureFlash: true
}));

//por defecto passport tiene las variable local
router.get('/users/signup', (req, res) => {
  res.render('users/signup');
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
/*  // para enviar correo 
    const transporter = nodemailer.createTransport({
        host: "smtpout.secureserver.net",
        port: 465,
        secure: true,
        auth: { 
            user:"contacto@priceanswers.com",
            pass:"lampara321!"
        },
        tls: { rejectUnauthorized: false}
      });

     const infoMailSend = await transporter.sendMail({
        from: "contacto@priceanswers.com",
        to: email,
        subject: "Sign Up PriceAnswers.com",
        html:`
                <h2> thank you for signing up at priceanswers.com </h2>
        `
      }, function(error){
        if(error){
          console.log(error)
        }
      }).then(data =>{
        console.log('Message sent', data.messageId)
      });
*/
    const emailUser = await User.findOne({ email: email });
    if (emailUser != null) {
      errors.push({ text: 'Email is already used' });
      res.render('users/signup', { errors, name, email, password, confirmPassword })
    } else {
      const newUser = new User({ name, email, password });
     // newUser.password = await newUser.encryptPassword(password);
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

router.get('/users/myprofile', async(req, res) => {

  const user = await User.findById(req.user.id).lean()
    .then(data => {
      return {
        name: data.name,
        email: data.email,
        imageProfileUrl: data.imageProfileUrl,
        public_ImageId: data.public_ImageId,
        ranking: data.ranking,
        short_describe: data.short_describe,
        experience_describe: data.experience_describe
      }
    })
  res.render('users/myprofile', {user});
});

router.put('/users/myprofile', isAuthenticated, async (req, res) => {
  const { name, email, short_describe, experience_describe } = req.body;

  if(typeof req.file !== 'undefined' && typeof req.file.path !== 'undefined' && req.file.path ){
    const result  = await cloudinary.v2.uploader.upload(req.file.path);
    const imageProfileUrl = result.url;
    const public_ImageId = result.public_id;
    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const query = {_id : idparamsObjectTypeID};
    await User.findOneAndUpdate(query, { name: name, email: email, imageProfileUrl: imageProfileUrl, public_ImageId: public_ImageId, short_describe: short_describe, experience_describe: experience_describe});
    await fs.unlink(req.file.path);
  }else{
    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const query = {_id : idparamsObjectTypeID};
    await User.findOneAndUpdate(query, { name: name, email: email, short_describe: short_describe, experience_describe: experience_describe });
  }

  req.flash('success_msg', 'Note Updated Successfully');  
  res.redirect('/users/myprofile');

})


module.exports = router;