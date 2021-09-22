const express = require('express')
const router = express.Router(); //me permite crear rutas
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/Users');
const passport = require('passport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
var countriesList = require('countries-list');
const Email = require('email-templates');
const path = require('path');
const Promise = require('bluebird');
var hbs = require('nodemailer-express-handlebars');


//console.log(countriesList.countries);


const cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_cloud_name,
  api_key: process.env.CLOUDINARY_api_key,
  api_secret: process.env.CLOUDINARY_api_secret
});
const fs = require('fs-extra'); // permite borrar archivos



router.get('/users/signin', (req, res) => {
  if (typeof req.user === 'undefined') {
    res.render('users/signin');
  } else {
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

  if (typeof req.user === 'undefined') {
    res.render('users/signup');
  } else {
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
      const newUser = new User({ name, email, password, paypal_account_verified: false });
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
  const { name, short_describe, experience_describe } = req.body;
  const country_birth = req.body.country_birth;

  if (typeof req.file !== 'undefined' && typeof req.file.path !== 'undefined' && req.file.path) {
    const result = await cloudinary.v2.uploader.upload(req.file.path);
    const imageProfileUrl = result.url;
    const public_ImageId = result.public_id;
    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const query = { _id: idparamsObjectTypeID };
    await User.findOneAndUpdate(query, { name: name, imageProfileUrl: imageProfileUrl, public_ImageId: public_ImageId, short_describe: short_describe, experience_describe: experience_describe, country_birth: country_birth });
    await fs.unlink(req.file.path);
  } else {
    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const query = { _id: idparamsObjectTypeID };
    await User.findOneAndUpdate(query, { name: name, short_describe: short_describe, experience_describe: experience_describe, country_birth: country_birth });
  }

  req.flash('success_msg', 'Profile Updated Successfully');
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
      await User.findByIdAndUpdate(req.user.id, { password: newPassEncrypted });
    }

    req.flash('success_msg', 'Password Updated Successfully');
    res.redirect('/users/myprofile');
  }
})

router.get('/users/recoverypass', (req, res) => {
  res.render('users/recovery-pass');
});


router.put('/users/recoverypass', async (req, res) => {

  const emailUser = req.body.email;


  const user = await User.findOne({ email: emailUser });

  if (user == null) {
    req.flash('error_msg', 'The email entered is not registered in Priceanswers.com');
    res.redirect('/users/recoverypass');
  } else {


    const firstPartEmailUser = emailUser.split('@')[0];

    // Generate test SMTP service account from ethereal.email
    // create reusable transporter object using the default SMTP transport
    console.log(process.env.SMTP_NODEMAILER_HOST)
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_NODEMAILER_HOST,
      port: process.env.SMTP_NODEMAILER_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_NODEMAILER_USER, // generated ethereal user
        pass: process.env.SMTP_NODEMAILER_PASS, // generated ethereal password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    var options = {
      viewEngine: {
        extname: '.hbs', // handlebars extension
        layoutsDir: path.join(__dirname, '../views/templates'), // location of handlebars templates
        defaultLayout: 'html', // name of main template
        partialsDir: path.join(__dirname, '../views/templates'), // location of your subtemplates aka. header, footer etc
      },
      viewPath: path.join(__dirname, '../views/templates'),
      extName: '.hbs'
    };

    transporter.use('compile', hbs(options));

    const linkUrlNewPass = 'https://www.priceanswers.com/users/recoverypassnew/' + user._id;
    // send mail with defined transport object
    let info =  transporter.sendMail({
      from: 'contact@priceanswers.com', // sender address
      to: emailUser, // list of receivers
      subject: "Hello ✔", // Subject line
      template: 'html',
      context: {
        name: firstPartEmailUser,
        link: linkUrlNewPass
      }
    }).catch(console.error);



    req.flash('success_msg', "An email has been sent to your email. If this email address is registered to Priceanswers.com, you'll receive instructions on how to set a new password.");
    res.redirect('/users/recoverypass');
  }
})


router.get('/users/recoverypassnew/:id', (req, res) => {
  const idUser = req.params.id;
  res.render('users/recovery-pass-new', { idUser });
});

router.put('/users/recoverypassnew', async (req, res) => {
  const { idU, newpassword, confirmpassword } = req.body;
  const errors = [];

  if (newpassword.length <= 10) {
    errors.push({ text: 'Password must be at least 10 characters' })
  }
  if (errors.length > 0) {
    res.render('users/recoverypassnew', { errors })
  } else {

    const idparamsObjectTypeID = mongoose.Types.ObjectId(idU);
    const user = await User.findOne({ _id: idparamsObjectTypeID });

    if (user != null) {
      const newPassEncrypted = await user.encryptPassword(newpassword);
      await User.findByIdAndUpdate(idU, { password: newPassEncrypted });

      req.flash('success_msg', 'Password Updated Successfully');
      res.redirect('/users/signin');
    } else {
      req.flash('error_msg', 'No user found, please do the procedure again or re-register');
      res.redirect('/users/signin');

    }


  }
})
module.exports = router;