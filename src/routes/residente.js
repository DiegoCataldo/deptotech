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
const MuroResidenteQuestion = require('../models/MuroResidenteQuestion');
const MuroResidenteAnswer = require('../models/MuroResidenteAnswer');
const MuroAdminQuestion = require('../models/MuroAdminQuestion');
const MuroAdminAnswer = require('../models/MuroAdminAnswer');
const EncuestaQuestion = require('../models/EncuestaQuestion');
const EncuestaAnswer = require('../models/EncuestaAnswer');
const { isAuthenticated } = require('../helpers/auth');
const { updateMany } = require('../models/Question');
const datefns = require('date-fns');
const fileUpload = require('express-fileupload');



/////////////////////////////********* AGREGAR UN NUEVO DEPTO ************ //////////////////////////////////////////

/// Interfaz que te solicita codigo de residente para agregarte al edificio
router.get('/residente/addedificio', isAuthenticated, async (req, res) => {
  res.render('residente/addedificio/addedificio', {})
});

/// agregar edificio nuevo al residente
router.post('/residente/addedificio', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);

  const { password_residentes } = req.body;
  const errors = [];

  if (password_residentes.length <= 6) {
    errors.push({ text: 'La códigos deben ser de al menos 6 caracteres, por favor verifique nuevamente su código' })
  }

  if (errors.length > 0) {
    res.render('residente/addedificio/addedificio', {
      errors, password_residentes
    })
  } else {

    //busco el edificio que tenga esa contraseña
    const filter = { password_residentes: password_residentes };
    const edificio = await Edificio.findOne(filter);
    //console.log(JSON.stringify(edificio, null, 2));

    // si no lo encuentra
    if (edificio == null) {
      errors.push({ text: 'Código erroneo, por favor intente nuevamente o contactese con el administrador.' })
      res.render('residente/addedificio/addedificio', {
        errors,
      })
    } else {
      // si lo encuentra
      const edificio_id = edificio._id;

      res.redirect('/residente/addedificiostep2/' + edificio_id);
    }

  }

});

/// obtener tabla con todas las torres del edificio  //
router.get('/residente/addedificiostep2/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
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
  ]);

  //console.log(JSON.stringify(edificios, null, 2));

  res.render('residente/addedificio/addedificiostep2', {
    edificio, torres,
    helpers: {}

  })

});

/// obtener tabla con todos los deptos de la torre seleccionada //
router.get('/residente/addedificiostep3/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
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
    { $sort: { "createdAt": -1 } }
  ]);

  //console.log(JSON.stringify(edificios, null, 2));

  res.render('residente/addedificio/addedificiostep3', {
    edificio, torre, deptos,
    helpers: {}

  })

});


/// hacer update del usuario con el nuevo depto //
router.get('/residente/addedificiostep4/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_depto = mongoose.Types.ObjectId(req.params.id);

  //busco la info de la torre
  var depto = await Depto.findById(id_depto).lean()
    .then(data => {
      return {
        _id: data._id,
        piso: data.piso,
        depto: data.depto,
        torre_id: data.torre_id,
        edificio_id: data.edificio_id
      }
    });
  const torre_id = mongoose.Types.ObjectId(depto.torre_id);
  const edificio_id = mongoose.Types.ObjectId(depto.edificio_id);

  var torre = await Torre.findById(torre_id).lean()
    .then(data => {
      return {
        _id: data._id,
        nombre: data.nombre,
      }
    });

  //busco la info del edificio
  var edificio = await Edificio.findById(edificio_id).lean()
    .then(data => {
      return {
        _id: data._id,
        nombre: data.nombre
      }
    });

  // agrego el depto al usuario
  const update = { $push: { id_depto_residente: id_depto } };
  const filter = { _id: userID };

  await User.findOneAndUpdate(filter, update, { new: true });

  req.flash('success_msg', 'Felicitaciones su unidad fue agregada correctamente');
  res.redirect('/residente/selectdepto/');

})

/////////////////////////////********* GENERAL ************ //////////////////////////////////////////

/// panel seleccionar el depto a utilizar //
router.get('/residente/selectdepto/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);

  id_depto_residente = req.user.id_depto_residente;

  // busco los deptos de la torre
  const queryMatchFilter = { '_id': { '$in': id_depto_residente } }
  const deptos = await Depto.find(queryMatchFilter).lean();

  res.render('residente/general/selectdepto', {
    deptos,
    helpers: {}
  })

})

/// seleccionar el depto a utilizar (aqui guardo el depto en la variable sesion) //
router.get('/residente/selecteddepto/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_depto = mongoose.Types.ObjectId(req.params.id);
  req.session.current_depto = id_depto;

  res.redirect('/residente/muro-residentes');

})


/////////////////////////////********* MURO RESIDENTES ************ //////////////////////////////////////////

/// muro de residentes //
router.get('/residente/muro-residentes/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_depto = req.session.current_depto;
  const administrador = req.user.administrador;


  //obtengo info del depto como su torre y edificio
  var depto_info = await Depto.findById(id_depto).lean()
    .then(data => {
      return {
        _id: data._id,
        edificio_id: data.edificio_id,
        edificio_nombre: data.edificio_nombre,
        torre_id: data.torre_id,
        torre_nombre: data.torre_nombre
      }
    });

  //creo el user_info
  const user_info = { userID: userID, name: req.user.name, id_depto_residente: req.user.id_depto_residente, administrador: administrador }

  //esto es para el pagination
  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const limit = 15;

  //obtengo la info del muro de los residentes de este edificio
  var queryMatch_edificio = { 'user_edificio_id': depto_info.edificio_id };
  const MuroResidenteQuestions = await MuroResidenteQuestion.aggregate([
    { $match: queryMatch_edificio },
    {
      $lookup: {
        from: "MuroResidentesAnswer",
        let: { "muroResidentesQuestionid": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$id_question", "$$muroResidentesQuestionid"] } } },
          { $project: { "answer": 0, "createdAt": 0 } }
        ],
        as: "answers_info"
      }
    },
    { $skip: skip * limit },
    { $sort: { "createdAt": -1 } },
    { $limit: limit }
  ]);

  res.render('residente/murores/muro-residentes', {
    user_info, MuroResidenteQuestions, depto_info,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      },
      ifFalse: function (variable, options) {
        return (!variable) ? options.fn(this) : options.inverse(this);
      },
      ifEquals: function (variable1, variable2, options) {
        if (variable1 == null) {
          variable1 = '';
        }
        if (variable2 == null) {
          variable2 = '';
        }

        return (variable1.toString() == variable2.toString()) ? options.fn(this) : options.inverse(this);
      },
    }
  })


})

//////////// Muro Residentes Escribir nueva pregunta  /////////
router.get('/residente/muro-residente/newquestion/:id_depto', isAuthenticated, async (req, res) => {

  const id_depto = mongoose.Types.ObjectId(req.params.id_depto);


  res.render('residente/murores/new-question', {
    id_depto,
    helpers: {}
  });
});


////// agregar publicacion residentes//////////
router.post('/residente/muro-residente/addquestion', isAuthenticated, async (req, res) => {
  const { title, description, id_depto, tipo_publicacion } = req.body;
  const errors = [];
  if (!title) {
    errors.push({ text: 'Please Write a Title' });
  }
  if (!description) {
    errors.push({ text: 'Please Write a Description' })
  }

  if (errors.length > 0) {
    res.render('residente/murores/new-question', {
      errors,
      title,
      description
    })
  } else {
    const userID = mongoose.Types.ObjectId(req.user.id);
    const nameUser = req.user.name;

    //obtengo info del depto como su torre y edificio
    var depto_info = await Depto.findById(id_depto).lean()
      .then(data => {
        return {
          _id: data._id,
          depto: data.depto,
          edificio_id: data.edificio_id,
          edificio_nombre: data.edificio_nombre,
          torre_id: data.torre_id,
          torre_nombre: data.torre_nombre
        }
      });

    if (tipo_publicacion == 'publicacion_simple') {
      estado = "Publicado"
    } else if (tipo_publicacion == "solicitud") {
      estado = "No respondida por Administrador"
    }


    // agrego la Pregunta
    const newQuestion = new MuroResidenteQuestion({
      title, description, tipo_publicacion, user_edificio_id: depto_info.edificio_id, user_torre_id: depto_info.torre_id, user_depto_id: depto_info._id, user_edificio_nombre: depto_info.edificio_nombre, user_torre_nombre: depto_info.torre_nombre, user_depto_nombre: depto_info.depto, user_id: userID, user_nombre: nameUser, estado, respondida_por_admin: "No"
    });
    await newQuestion.save()
    req.flash('success_msg', 'Solicitud Agregada correctamente');
    res.redirect('/residente/muro-residentes/');
  }

});

/// ver pregunta //
router.get('/residente/muro-residentes/verquestion/:id_question', isAuthenticated, async (req, res) => {

  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_question = mongoose.Types.ObjectId(req.params.id_question);
  const id_depto_user = req.session.current_depto;
  console.log(req.session.current_depto);


  /// obtengo la info de la pregunta ////
  const question = await MuroResidenteQuestion.findById(id_question).lean()
    .then(data => {
      return {
        id: data._id,
        title: data.title,
        description: data.description,
        createdAt: data.createdAt,
        user_id: data.user_id,
        user_nombre: data.user_nombre,
        allanswerinfo: data.allanswerinfo,
        user_edificio_id: data.user_edificio_id,
        user_edificio_nombre: data.user_edificio_nombre,
        user_torre_id: data.user_torre_id,
        user_torre_nombre: data.user_torre_nombre,
        user_depto_id: data.user_depto_id,
        user_depto_nombre: data.user_depto_nombre,
        tipo_publicacion: data.tipo_publicacion,
        respondida_por_admin: data.respondida_por_admin,
        estado: data.estado,
      }
    })

  /// obtengo la info de las respuestas a la pregunta ////
  const queryMatchAnswer = { 'id_question': id_question };

  const answers = await MuroResidenteAnswer.aggregate([
    { $match: queryMatchAnswer },
    {
      $lookup: {
        from: "users",
        let: { "user_answer": "$user_answer_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$user_answer"] } } },
          { $project: { "password": 0, "createdAt": 0, "email": 0 } }
        ],
        as: "user_info"
      }
    }
  ]);


  res.render('residente/murores/ver-question', {
    answers, question, id_depto_user,userID,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      },
      ifFalse: function (variable, options) {
        return (!variable) ? options.fn(this) : options.inverse(this);
      },
      ifEquals: function (variable1, variable2, options) {
        if (variable1 == null) {
          variable1 = '';
        }
        if (variable2 == null) {
          variable2 = '';
        }

        return (variable1.toString() == variable2.toString()) ? options.fn(this) : options.inverse(this);
      },
    }
  })

})

///// crear respuesta a una pregunta ///////
router.put('/residente/muro-residentes/doanswer/:id', isAuthenticated, async (req, res) => {

  const answer = req.body.new_answer;
  const id_depto_user = mongoose.Types.ObjectId(req.session.current_depto);
  const user_answer_id = mongoose.Types.ObjectId(req.user.id);
  const user_answer_nombre = req.user.name;
  const id_question = mongoose.Types.ObjectId(req.params.id);


  const errors = [];
  if (!answer) {
    errors.push({ text: 'Por favor escribe una respuesta o comentario' });
  }
  if (errors.length > 0) {
    res.redirect('/residente/muro-residentes/ver-question/' + id_question, {
      errors,
    })
  } else {
    /// busco el id de la persona que hizo la pregunta 
    const question = await MuroResidenteQuestion.findById(id_question).lean()
      .then(data => {
        return {
          _id: data._id,
          user_id: data.user_id,
          user_nombre: data.user_nombre
        }
      });

    //obtengo info del depto como su torre y edificio
    var depto_info = await Depto.findById(id_depto_user).lean()
      .then(data => {
        return {
          _id: data._id,
          edificio_id: data.edificio_id,
          edificio_nombre: data.edificio_nombre,
          torre_id: data.torre_id,
          torre_nombre: data.torre_nombre,
          depto: data.depto
        }
      });
      console.log(JSON.stringify(depto_info, null, 2));


    const user_question_id = question.user_id;
    const user_question_nombre = question.user_nombre;


    const newAnswer = new MuroResidenteAnswer(
      {
        answer, user_answer_id, user_answer_nombre, user_question_id, user_question_nombre, id_question, user_es_admin: false, user_edificio_id: depto_info.edificio_id, user_torre_id: depto_info.torre_id, user_depto_id: depto_info._id, user_edificio_nombre: depto_info.edificio_nombre, user_torre_nombre: depto_info.torre_nombre, user_depto_nombre: depto_info.depto
      });
    await newAnswer.save()
    req.flash('success_msg', 'Respuesta/comentario agregado correctamente');
    res.redirect('/residente/muro-residentes/verquestion/' + id_question);

  }
})

/////////eliminar pregunta/////
router.get('/residente/muro-residentes/deletequestion/:id', isAuthenticated, async (req, res) => {

  await MuroResidenteQuestion.findByIdAndDelete(req.params.id)
  req.flash('success_msg', 'La solicitud/pregunta fue eliminada correctamente');
  res.redirect('/residente/muro-residentes/');

});


/////////////////////////////********* MURO ADMINISTRADORES ************ //////////////////////////////////////////

/// muro de administradores //
router.get('/residente/muro-admin/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_depto = req.session.current_depto;

  //obtengo info del depto como su torre y edificio
  var depto_info = await Depto.findById(id_depto).lean()
    .then(data => {
      return {
        _id: data._id,
        edificio_id: data.edificio_id,
        edificio_nombre: data.edificio_nombre,
        torre_id: data.torre_id,
        torre_nombre: data.torre_nombre
      }
    });

  //creo el user_info
  const user_info = { userID: userID, name: req.user.name, id_depto_residente: req.user.id_depto_residente }

  //esto es para el pagination
  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const limit = 15;

  //obtengo la info del muro de los administradores de este edificio
  var queryMatch_edificio = { 'user_edificio_id': mongoose.Types.ObjectId(depto_info.edificio_id) };
  const MuroAdminQuestions = await MuroAdminQuestion.aggregate([
    { $match: queryMatch_edificio },
    {
      $lookup: {
        from: "MuroAdminAnswers",
        let: { "muroAdminQuestionid": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$id_question", "$$muroAdminQuestionid"] } } },
          { $project: { "answer": 0, "createdAt": 0 } }
        ],
        as: "answers_info"
      }
    },
    { $skip: skip * limit },
    { $sort: { "createdAt": -1 } },
    { $limit: limit }
  ]);

  res.render('residente/muroadmin/muro-admin', {
    user_info, MuroAdminQuestions, depto_info,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      },
      ifFalse: function (variable, options) {
        return (!variable) ? options.fn(this) : options.inverse(this);
      },
      ifEquals: function (variable1, variable2, options) {
        if (variable1 == null) {
          variable1 = '';
        }
        if (variable2 == null) {
          variable2 = '';
        }

        return (variable1.toString() == variable2.toString()) ? options.fn(this) : options.inverse(this);
      },
    }
  })

})

/// ver pregunta //
router.get('/residente/muro-admin/verquestion/:id_question', isAuthenticated, async (req, res) => {

  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_question = mongoose.Types.ObjectId(req.params.id_question);
  const id_depto = req.session.current_depto;

  /// obtengo la info de la pregunta ////
  const question = await MuroAdminQuestion.findById(id_question).lean()
    .then(data => {
      return {
        id: data._id,
        title: data.title,
        description: data.description,
        createdAt: data.createdAt,
        user_id: data.user_id,
        user_nombre: data.user_nombre,
        allanswerinfo: data.allanswerinfo,
        user_edificio_id: data.user_edificio_id,
        user_edificio_nombre: data.user_edificio_nombre,
        user_torre_id: data.user_torre_id,
        user_torre_nombre: data.user_torre_nombre,
        user_depto_id: data.user_depto_id,
        user_depto_nombre: data.user_depto_nombre,
        tipo_publicacion: data.tipo_publicacion,
        respondida_por_admin: data.respondida_por_admin,
        estado: data.estado,
      }
    })

  /// obtengo la info de las respuestas a la pregunta ////
  const queryMatchAnswer = { 'id_question': id_question };

  const answers = await MuroAdminAnswer.aggregate([
    { $match: queryMatchAnswer },

  ]);

  //console.log(JSON.stringify(answers, null, 2));


  res.render('residente/muroadmin/ver-question', {
    answers, question, id_depto, userID,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      },
      ifFalse: function (variable, options) {
        return (!variable) ? options.fn(this) : options.inverse(this);
      },
      ifEquals: function (variable1, variable2, options) {
        if (variable1 == null) {
          variable1 = '';
        }
        if (variable2 == null) {
          variable2 = '';
        }

        return (variable1.toString() == variable2.toString()) ? options.fn(this) : options.inverse(this);
      },
    }
  })

})

///// crear respuesta a una pregunta ///////
router.put('/residente/muro-admin/doanswer/:id', isAuthenticated, async (req, res) => {

  const answer = req.body.new_answer;
  const id_depto = mongoose.Types.ObjectId(req.session.current_depto);
  const user_answer_id = mongoose.Types.ObjectId(req.user.id);
  const user_answer_nombre = req.user.name;
  const id_question = req.params.id;


  const errors = [];
  if (!answer) {
    errors.push({ text: 'Por favor escribe una respuesta o comentario' });
  }
  if (errors.length > 0) {
    res.redirect('/residente/muro-admin/ver-question/' + id_question, {
      errors,
    })
  } else {

    /// busco la info de la persona que hizo la pregunta 
    const question = await MuroAdminQuestion.findById(id_question).lean()
      .then(data => {
        return {
          _id: data._id,
          user_id: data.user_id,
          user_nombre: data.user_nombre
        }
      });

    //obtengo info del depto como su torre y edificio
    var depto_info = await Depto.findById(id_depto).lean()
      .then(data => {
        return {
          _id: data._id,
          edificio_id: data.edificio_id,
          edificio_nombre: data.edificio_nombre,
          torre_id: data.torre_id,
          torre_nombre: data.torre_nombre,
          depto: data.depto
        }
      });

    const user_question_id = question.user_id;
    const user_question_nombre = question.user_nombre;


    const newAnswer = new MuroAdminAnswer(
      {
        answer, user_answer_id, user_answer_nombre, user_question_id, user_question_nombre, id_question, user_es_admin: false, user_edificio_id: depto_info.edificio_id, user_torre_id: depto_info.torre_id, user_depto_id: depto_info._id, user_edificio_nombre: depto_info.edificio_nombre, user_torre_nombre: depto_info.torre_nombre, user_depto_nombre: depto_info.depto
      });

    await newAnswer.save()
    req.flash('success_msg', 'Respuesta/comentario agregado correctamente');
    res.redirect('/residente/muro-admin/verquestion/' + id_question);

  }
})


/////////////////////////////********* ENCUESTAS************ //////////////////////////////////////////

/// Encuestas //
router.get('/residente/encuestas/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_depto = req.session.current_depto;

  //obtengo info del depto como su torre y edificio
  var depto_info = await Depto.findById(id_depto).lean()
    .then(data => {
      return {
        _id: data._id,
        edificio_id: data.edificio_id,
        edificio_nombre: data.edificio_nombre,
        torre_id: data.torre_id,
        torre_nombre: data.torre_nombre
      }
    });

  //creo el user_info
  const user_info = { userID: userID, name: req.user.name, id_depto_residente: req.user.id_depto_residente }

  //esto es para el pagination
  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const limit = 15;

  //obtengo la info del muro de los residentes de este edificio
  var queryMatch_edificio = { 'user_edificio_id': depto_info.edificio_id };
  const EncuestaQuestions = await EncuestaQuestion.aggregate([
    { $match: queryMatch_edificio },
    {
      $lookup: {
        from: "EncuestaAnswer",
        let: { "encuestaQuestionid": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$id_question", "$$encuestaQuestionid"] } } },
          { $project: { "answer": 0, "createdAt": 0 } }
        ],
        as: "answers_info"
      }
    },
    { $skip: skip * limit },
    { $sort: { "createdAt": -1 } },
    { $limit: limit }
  ]);

  res.render('residente/encuestas/muro-encuestas', {
    user_info, EncuestaQuestions, depto_info,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      },
      ifFalse: function (variable, options) {
        return (!variable) ? options.fn(this) : options.inverse(this);
      },
      ifEquals: function (variable1, variable2, options) {
        if (variable1 == null) {
          variable1 = '';
        }
        if (variable2 == null) {
          variable2 = '';
        }

        return (variable1.toString() == variable2.toString()) ? options.fn(this) : options.inverse(this);
      },
    }
  })


})

//////////// Escribir nueva encuesta  /////////
router.get('/residente/encuestas/newquestion/', isAuthenticated, async (req, res) => {

  const id_depto =req.session.current_depto;

  res.render('residente/encuestas/new-question', {
    id_depto,
    helpers: {}
  });
});

///// Crear nueva encuesta ///////
router.post('/residente/encuestas/newquestion/', isAuthenticated, async (req, res) => {

  const title = req.body.pregunta;
  const opciones = req.body.tagsArray;
  const id_depto_user = mongoose.Types.ObjectId(req.session.current_depto);
  const user_id = mongoose.Types.ObjectId(req.user.id);
  const user_nombre = req.user.name;

  const errors = [];
  if (!title) {
    errors.push({ text: 'Por favor escriba el titulo de la encuesta' });
  }
  if (!opciones) {
    errors.push({ text: 'Por favor agregue opciones a la encuesta' });
  }

  if (errors.length > 0) {
    res.render('residente/encuestas/new-question', {
      errors,
      title
    })
    
  } else {

    //obtengo info del depto como su torre y edificio
    var depto_info = await Depto.findById(id_depto_user).lean()
      .then(data => {
        return {
          _id: data._id,
          edificio_id: data.edificio_id,
          edificio_nombre: data.edificio_nombre,
          torre_id: data.torre_id,
          torre_nombre: data.torre_nombre,
          depto: data.depto
        }
      });
      console.log(JSON.stringify(depto_info, null, 2));

    const newAnswer = new EncuestaQuestion(
      {
        title, opciones,  user_id, user_nombre, user_es_admin: false, user_edificio_id: depto_info.edificio_id, user_torre_id: depto_info.torre_id, user_depto_id: depto_info._id, user_edificio_nombre: depto_info.edificio_nombre, user_torre_nombre: depto_info.torre_nombre, user_depto_nombre: depto_info.depto
      });
    await newAnswer.save()
    req.flash('success_msg', 'Encuesta agregada correctamente');
    res.redirect('/residente/encuestas/');

  }
})

/// ver pregunta //
router.get('/residente/encuestas/verquestion/:id_question', isAuthenticated, async (req, res) => {

  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_question = mongoose.Types.ObjectId(req.params.id_question);
  const id_depto = req.session.current_depto;

  /// obtengo la info de la pregunta ////
  const question = await EncuestaQuestion.findById(id_question).lean()
    .then(data => {
      return {
        id: data._id,
        title: data.title,
        description: data.description,
        createdAt: data.createdAt,
        user_id: data.user_id,
        user_nombre: data.user_nombre,
        allanswerinfo: data.allanswerinfo,
        user_edificio_id: data.user_edificio_id,
        user_edificio_nombre: data.user_edificio_nombre,
        opciones: data.opciones
      }
    })

  /// obtengo la info de las respuestas a la pregunta ////
  const queryMatchAnswer = { 'id_question': id_question };

  const answers = await MuroAdminAnswer.aggregate([
    { $match: queryMatchAnswer },

  ]);

  //console.log(JSON.stringify(answers, null, 2));


  res.render('residente/encuestas/ver-question', {
    answers, question, id_depto, userID,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      },
      ifFalse: function (variable, options) {
        return (!variable) ? options.fn(this) : options.inverse(this);
      },
      ifEquals: function (variable1, variable2, options) {
        if (variable1 == null) {
          variable1 = '';
        }
        if (variable2 == null) {
          variable2 = '';
        }

        return (variable1.toString() == variable2.toString()) ? options.fn(this) : options.inverse(this);
      },
    }
  })

})

/////////eliminar encuesta/////
router.get('/residente/encuestas/deleteencuesta/:id', isAuthenticated, async (req, res) => {

  await EncuestaQuestion.findByIdAndDelete(req.params.id)
  req.flash('success_msg', 'La encuesta fue eliminada correctamente');
  res.redirect('/residente/encuestas/');

});



/////////////////////////////********* AGENDAR************ //////////////////////////////////////////

/// Encuestas //
router.get('/residente/agendar/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_depto = req.session.current_depto;

  //obtengo info del depto como su torre y edificio
  var depto_info = await Depto.findById(id_depto).lean()
    .then(data => {
      return {
        _id: data._id,
        edificio_id: data.edificio_id,
        edificio_nombre: data.edificio_nombre,
        torre_id: data.torre_id,
        torre_nombre: data.torre_nombre
      }
    });

  //creo el user_info
  const user_info = { userID: userID, name: req.user.name, id_depto_residente: req.user.id_depto_residente }

  //esto es para el pagination
  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const limit = 15;

  //obtengo la info del muro de los residentes de este edificio
  var queryMatch_edificio = { 'user_edificio_id': depto_info.edificio_id };
  const EncuestaQuestions = await EncuestaQuestion.aggregate([
    { $match: queryMatch_edificio },
    {
      $lookup: {
        from: "EncuestaAnswer",
        let: { "encuestaQuestionid": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$id_question", "$$encuestaQuestionid"] } } },
          { $project: { "answer": 0, "createdAt": 0 } }
        ],
        as: "answers_info"
      }
    },
    { $skip: skip * limit },
    { $sort: { "createdAt": -1 } },
    { $limit: limit }
  ]);

  res.render('residente/agendar/agendar', {
    user_info, EncuestaQuestions, depto_info,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      },
      ifFalse: function (variable, options) {
        return (!variable) ? options.fn(this) : options.inverse(this);
      },
      ifEquals: function (variable1, variable2, options) {
        if (variable1 == null) {
          variable1 = '';
        }
        if (variable2 == null) {
          variable2 = '';
        }

        return (variable1.toString() == variable2.toString()) ? options.fn(this) : options.inverse(this);
      },
    }
  })


})



module.exports = router;


