const express = require('express')
const router = express.Router(); //me permite crear rutas
const mongoose = require('mongoose');
var fs = require('fs');
var sharp = require('sharp');
var path = require('path');
const imageConversion = require('image-conversion');
let imgConvert = require('image-convert');
const User = require('../models/Users');
const WithdrawRequest = require('../models/WithdrawRequest');
const { isAuthenticated } = require('../helpers/auth');
const { updateMany } = require('../models/Question');
const datefns = require('date-fns');
const fileUpload = require('express-fileupload');

/// pagina principal que redirecciona segun cargo
router.get('/main/principal', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  
  // busco la info del usuario
  const user = await User.findById(userID).lean()
    .then(data => {
      return {
        name: data.name,
        administrador: data.administrador,
        residente: data.residente,
        superadmin: data.superadmin,
        id_edificio_administrando: data.id_edificio_administrando,
        id_depto_residente: data.id_depto_residente
      }
    });

  var id_depto_residente = user.id_depto_residente;
  var residente_depto;
  var id_edificio_administrando = user.id_edificio_administrando;
  var administra_edificio;


  // Consulto si el usuario tiene edificios administrando
  if (Array.isArray(id_edificio_administrando)) {
    if (id_edificio_administrando.length) {
      administra_edificio = true;
    } else {
      administra_edificio = false;
    }
  } else {
    if (id_edificio_administrando == null || id_edificio_administrando == '') {
      administra_edificio = false;
    } else {
      administra_edificio = true;
    }
  }

  // Consulto si el usuario tiene edificios como residente
  if (Array.isArray(id_depto_residente)) {
    if (id_depto_residente.length) {
      residente_depto = true;
    } else {
      residente_depto = false;
    }
  } else {
    if (id_depto_residente == null || id_depto_residente == '') {
      residente_depto = false;
    } else {
      residente_depto = true;
    }
  }


  // redirijo al usuario dependiendo su rol
  if (administra_edificio) {
      res.redirect('/administrador/selectedificio')
  } else if (residente_depto) {
    res.redirect('/residente/selectdepto')
  } else if (user.superadmin) {
    res.redirect('/superadmin/main')
  } else if (!administra_edificio && !residente_depto && !user.superadmin) {
    res.render('main/principal', {

    })
  }
})


router.get('/main/selectcargo/:cargo', isAuthenticated, async (req, res) => {
  const cargo = req.params.cargo;
  const userID = mongoose.Types.ObjectId(req.user.id);
  if (cargo == 'residente') {
    const filter = { _id: req.params.id };
    const update = { residente: true };
    //const user = await User.findOneAndUpdate(filter, update, { new: true });
    res.redirect('/residente/addedificio');

  } else if (cargo == 'administrador') {
    const filter = { _id: req.params.id };
    const update = { administrador: true };
    //const user = await User.findOneAndUpdate(filter, update, { new: true });
    res.redirect('/administrador/addedificio');
  }

})



module.exports = router;