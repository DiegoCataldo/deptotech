const express = require('express')
const router = express.Router(); //me permite crear rutas
const { isAuthenticated } = require('../helpers/auth');
const User = require('../models/Users');
const Question = require('../models/Question');
const Transfer = require('../models/Transfer');
const Answer = require('../models/Answer');
const passport = require('passport');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
var countriesList = require('countries-list');
const Email = require('email-templates');
const path = require('path');
const Promise = require('bluebird');
var hbs = require('nodemailer-express-handlebars');



///////////////// Sign in ////////////////////////

router.get('/users/signin', (req, res) => {
  if (typeof req.user === 'undefined') {
    res.render('users/signin', {layout: 'main-user'});
  } else {
    res.redirect('/');
  }
});

router.post('/users/signin', passport.authenticate('local', {
  successRedirect: '/main/principal',
  failureRedirect: '/users/signin',
  failureFlash: true
}));

///////////////// END Sign in ////////////////

////////////////// Sign Up //////////////////

router.post('/users/signup', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const errors = [];
  if (name.length <= 0) {
    errors.push({ text: 'Por favor inserte un nombre' })
  }
  if (password != confirmPassword) {
    errors.push({ text: 'Las contraseñas no coinciden' });
  }
  if (password.length <= 6) {
    errors.push({ text: 'La contraseña debe ser de al menos 6 caracteres' })
  }
  if (errors.length > 0) {
    res.render('users/signin', { errors, name, email, password, confirmPassword })
  } else {

    const emailUser = await User.findOne({ email: email });
    if (emailUser != null) {
      errors.push({ text: 'El email está en uso por favor intentar con otro o intente ingresar' });
      res.render('users/signup', { errors, name, email, password, confirmPassword })
    } else {
      const newUser = new User({ name, email, password, residente: false, administrador: false, superadmin: false });
      newUser.password = await newUser.encryptPassword(password);
      await newUser.save();
      req.flash('success_msg', 'Excelente! ya esta registrado, ahora puedes ingresar');
      res.redirect('/users/signin');
    }
  }
})

router.get('/users/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

////////////////// END Sign Up ////////////////////////

//////////////// Profile /////////////////////

router.get('/users/myprofile', isAuthenticated, async (req, res) => {

  const user = await User.findById(req.user.id).lean()
    .then(data => {
      return {
        name: data.name,
        email: data.email,
        residente: data.residente,
        administrador: data.administrador,
        superadmin: data.superadmin
      }
    });
  res.render('users/myprofile', {
    user
  }
  );
});

router.put('/users/myprofile', isAuthenticated, async (req, res) => {
    const { name } = req.body;
    const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
    const query = { _id: idparamsObjectTypeID };
    await User.findOneAndUpdate(query, { name: name});
  
  req.flash('success_msg', 'Cambios guardados');
  res.redirect('/users/myprofile');

})
///////////////// END Profile //////////////////////

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
    req.flash('error_msg', 'The email entered is not registered in deptomin.com');
    res.redirect('/users/recoverypass');
  } else {


    const firstPartEmailUser = emailUser.split('@')[0];

    // Generate test SMTP service account from ethereal.email
    // create reusable transporter object using the default SMTP transport
    console.log(process.env.SMTP_NODEMAILER_HOST)
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_NODEMAILER_HOST,
      port: process.env.SMTP_NODEMAILER_PORT,
      secure: true, // true for 465, false for other ports
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

    const linkUrlNewPass = 'https://www.deptomin.com/users/recoverypassnew/' + user._id;
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: 'contacto@deptomin.com', // sender address
      to: emailUser, // list of receivers
      subject: "Hello ✔", // Subject line
      template: 'html',
      context: {
        name: firstPartEmailUser,
        link: linkUrlNewPass
      }
    }).catch(console.error);



    req.flash('success_msg', "An email has been sent to your email. If this email address is registered to Deptomin.com, you'll receive instructions on how to set a new password.");
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
      req.flash('error_msg', 'Usuario no encontrado, por favor revise si escribio bien su correo o intente registrandose nuevamente');
      res.redirect('/users/residente/signin');

    }
  }
})


module.exports = router;