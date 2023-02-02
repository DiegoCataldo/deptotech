const express = require('express')
const router = express.Router(); //me permite crear rutas
const mongoose = require('mongoose');
var fs = require('fs');
var sharp = require('sharp');
var path = require('path');
const imageConversion = require('image-conversion');
let imgConvert = require('image-convert');
const User = require('../models/Users');
const Edificio = require('../models/Edificio');
const Torre = require('../models/Torre');
const Depto = require('../models/Depto');
const WithdrawRequest = require('../models/WithdrawRequest');
const { isAuthenticated } = require('../helpers/auth');
const { updateMany } = require('../models/Question');
const datefns = require('date-fns');
const fileUpload = require('express-fileupload');


router.get('/superadmin/main', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  res.render('superadmin/main', {

  })

});
 /////////------- EDIFICIOS ---------
/// obtener tabla con todos los edificios //
router.get('/superadmin/alledificios:skip?', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  var limit = 10;
  var skip;
  // setear skip
  if (typeof req.body.skip === 'undefined' || parseInt(req.body.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.body.skip);
  }

  const edificios = await Edificio.aggregate([
    { $sort: { "createdAt": -1 } },
    { $skip: skip * limit },
    { $limit: limit }
  ]);

  console.log(JSON.stringify(edificios, null, 2));


  res.render('superadmin/alledificios', {
    edificios,
    helpers: {}

  })

});

/// agregar edificio nuevo
router.post('/superadmin/addedificio', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);

  const { nombre, direccion, password_residentes, password_administradores } = req.body;
  const errors = [];
  if (!nombre) {
    errors.push({ text: 'Por favor escribe un nombre' });
  }
  if (!direccion) {
    errors.push({ text: 'Por favor escribe una dirección' })
  }
  if (password_residentes.length <= 6) {
    errors.push({ text: 'La contraseñas debe ser de al menos 6 caracteres' })
  }
  if (password_administradores.length <= 6) {
    errors.push({ text: 'La contraseñas debe ser de al menos 6 caracteres' })
  }

  if (errors.length > 0) {
    res.render('superadmin/alledificios', {
      errors, nombre, direccion, password_residentes, password_administradores
    })
  } else {
    // agrego el edificio
    const newEdificio = new Edificio({
      errors, nombre, direccion, password_residentes, password_administradores
    });
    await newEdificio.save();

    var edificio_id = mongoose.Types.ObjectId(newEdificio._id);
  

    req.flash('success_msg', 'Edificio agregado Correctamente');
    res.redirect('/superadmin/alledificios');
  }
  //res.redirect('/superadmin/alledificios')

});

//modificar edificio
router.post('/superadmin/edificios/modificar/', isAuthenticated, async (req, res) => {

  const id_edificio = mongoose.Types.ObjectId(req.body.id_edificio);
  const {nombre, direccion, password_residentes, password_administradores} = req.body ;
  const update = { nombre: nombre, direccion: direccion, password_administradores: password_administradores, password_residentes: password_residentes };
  const filter = { _id: id_edificio };

  await Edificio.findOneAndUpdate(filter, update, { new: true });

  const updateDepto = { $set:{edificio_nombre: nombre }};
  const filterDepto = { edificio_id: id_edificio };

  await Depto.updateMany( filterDepto, updateDepto );

  req.flash('success_msg', 'Edificio modificado correctamente');
  res.redirect('/superadmin/alledificios/');

});

//eliminar edificio
router.get('/superadmin/edificios/delete/:idedificio', isAuthenticated, async (req, res) => {
  await Edificio.findByIdAndDelete(req.params.idedificio);
  const idedificio = req.params.idedificio;
  req.flash('success_msg', 'Torre eliminada correctamente');
  res.redirect('/superadmin/alledificios/');

});

 /////////------- TORRES ---------
//eliminar torre
router.get('/superadmin/torres/delete/:idtorre&:idedificio', isAuthenticated, async (req, res) => {
  await Torre.findByIdAndDelete(req.params.idtorre);
  const idedificio = req.params.idedificio;
  req.flash('success_msg', 'Torre eliminada correctamente');
  res.redirect('/superadmin/alltorres/' + idedificio);

});

/// obtener tabla con todos los edificios //
router.get('/superadmin/alltorres/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  var limit = 10;
  const id_edificio = mongoose.Types.ObjectId(req.params.id);

  //busco la info del edificio
  var edificio = await Edificio.findById(id_edificio).lean()
    .then(data => {
      return {
        _id: data._id,
        nombre: data.nombre
      }
    });

  // busco las torres del edificio
  const queryMatch = { 'edificio_id': id_edificio };
  const torres = await Torre.aggregate([

    { $match: queryMatch },
    { $sort: { "createdAt": -1 } },
    { $limit: limit }
  ]);

  //console.log(JSON.stringify(edificios, null, 2));

  res.render('superadmin/alltorres', {
    edificio, torres,
    helpers: {}

  })

});

//eliminar torre
router.get('/superadmin/torres/delete/:idtorre&:idedificio', isAuthenticated, async (req, res) => {
  await Torre.findByIdAndDelete(req.params.idtorre);
  const idedificio = req.params.idedificio;
  req.flash('success_msg', 'Torre eliminada correctamente');
  res.redirect('/superadmin/alltorres/' + idedificio);

});

/// agregar torre 
router.post('/superadmin/addtorre', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_edificio = mongoose.Types.ObjectId(req.body.id_edificio);

  const { nombre } = req.body;
  const errors = [];
  if (!nombre) {
    errors.push({ text: 'Por favor escribe un nombre' });
  }

  if (errors.length > 0) {
    res.render('superadmin/alltorres' + id_edificio, {
      errors, nombre
    })
  } else {

    var newTorre = new Torre({
      nombre: nombre, edificio_id: id_edificio
    });
    await newTorre.save();

    req.flash('success_msg', 'Torre agregado Correctamente');
    res.redirect('/superadmin/alltorres/' + id_edificio);
  }

});

//modificar torre
router.post('/superadmin/torres/modificar/', isAuthenticated, async (req, res) => {

  const id_edificio = mongoose.Types.ObjectId(req.body.id_edificio);
  const id_torre = mongoose.Types.ObjectId(req.body.id_torre);
  const nombre = req.body.nombre;
  const update = { nombre: nombre };
  const filter = { _id: id_torre };

  await Torre.findOneAndUpdate(filter, update, { new: true });

  const updateDepto = { $set:{torre_nombre: nombre }};
  const filterDepto = {  torre_id: id_torre };

  await Depto.updateMany( filterDepto, updateDepto );

  req.flash('success_msg', 'Torre modificada correctamente');
  res.redirect('/superadmin/alltorres/' + id_edificio);

});

 /////////------- DEPTOS ---------

/// obtener tabla con todos los deptos //
router.get('/superadmin/alldeptos/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  var limit = 100;
  const id_torre = mongoose.Types.ObjectId(req.params.id);


  //busco la info de la torre
  var torre = await Torre.findById(id_torre).lean()
    .then(data => {
      return {
        _id: data._id,
        nombre: data.nombre,
        edificio_id: data.edificio_id
      }
    });
  const edificio_id = mongoose.Types.ObjectId(torre.edificio_id);


  //busco la info del edificio
  var edificio = await Edificio.findById(edificio_id).lean()
    .then(data => {
      return {
        _id: data._id,
        nombre: data.nombre
      }
    });


  // busco los deptos de la torre
  const queryMatch = { 'torre_id': id_torre };
  const deptos = await Depto.aggregate([

    { $match: queryMatch },
    { $sort: { "createdAt": -1 } },
    { $limit: limit }
  ]);

  //console.log(JSON.stringify(edificios, null, 2));

  res.render('superadmin/alldeptos', {
    edificio, torre, deptos,
    helpers: {}

  })

});

/// agregar depto 
router.post('/superadmin/adddepto', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_edificio = mongoose.Types.ObjectId(req.body.id_edificio);
  const id_torre = mongoose.Types.ObjectId(req.body.id_torre);
  const { unidad, piso } = req.body;
  const errors = [];

  if (!unidad) {
    errors.push({ text: 'Por favor escribe un nombre' });
  }
  if (!piso) {
    errors.push({ text: 'Por favor escribe un piso' });
  }

  if (errors.length > 0) {
    res.render('superadmin/alldeptos' + id_torre, {
      errors, unidad, piso
    })
  } else {

      //busco la info de la torre
  var torre = await Torre.findById(id_torre).lean()
  .then(data => {
    return {
      _id: data._id,
      nombre: data.nombre,
      edificio_id: data.edificio_id
    }
  });
const edificio_id = mongoose.Types.ObjectId(torre.edificio_id);


//busco la info del edificio
var edificio = await Edificio.findById(edificio_id).lean()
  .then(data => {
    return {
      _id: data._id,
      nombre: data.nombre
    }
  });

    var newDepto = new Depto({
      depto: unidad, piso: piso, torre_id: id_torre, edificio_id: id_edificio, edificio_nombre: edificio.nombre, torre_nombre: torre.nombre
    });
    await newDepto.save();

    req.flash('success_msg', 'Depto agregado Correctamente');
    res.redirect('/superadmin/alldeptos/' + id_torre);
  }

});

//eliminar depto
router.get('/superadmin/deptos/delete/:iddepto&:idtorre', isAuthenticated, async (req, res) => {
  await Depto.findByIdAndDelete(req.params.iddepto);
  const idtorre = req.params.idtorre;
  req.flash('success_msg', 'Depto eliminada correctamente');
  res.redirect('/superadmin/alldeptos/' + idtorre);

});

//modificar depto
router.post('/superadmin/deptos/modificar/', isAuthenticated, async (req, res) => {

  const id_depto = mongoose.Types.ObjectId(req.body.id_depto);
  const id_torre = mongoose.Types.ObjectId(req.body.id_torre);
  const depto = req.body.unidad;
  const piso = req.body.piso;
  const update = { depto: depto, piso: piso };
  const filter = { _id: id_depto };

  await Depto.findOneAndUpdate(filter, update, { new: true });

  req.flash('success_msg', 'Depto modificado correctamente');
  res.redirect('/superadmin/alldeptos/' + id_torre);

});


 /////////------- PROPIETARIOS ---------
/// obtener tabla con todos los propietarios de un depto //
router.get('/superadmin/copropietarios-depto/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  var limit = 100;
  const id_depto = mongoose.Types.ObjectId(req.params.id);

  const queryMatchCo = { 'id_depto_residente': { '$in': id_depto } }

  const copropietarios = await User.aggregate([

    { $match: queryMatchCo },
    { $sort: { "createdAt": -1 } }
  ]);

  //console.log(JSON.stringify(edificios, null, 2));

  res.render('superadmin/alldeptos', {
    copropietarios, 
    helpers: {}

  })

});



module.exports = router;