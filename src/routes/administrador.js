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

const { isAuthenticated } = require('../helpers/auth');
const { updateMany } = require('../models/Question');
const datefns = require('date-fns');
const fileUpload = require('express-fileupload');


/////////////////////////////********* AGREGAR UN NUEVO EDIFICIO ************ //////////////////////////////////////////

router.get('/administrador/addedificio', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  res.render('administrador/addedificio/addedificio', {
  })
})

/// agregar edificio nuevo al residente
router.post('/administrador/addedificio', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);

  const { password_administrador } = req.body;
  const errors = [];

  if (password_administrador.length <= 6) {
    errors.push({ text: 'La códigos deben ser de al menos 6 caracteres, por favor verifique nuevamente su código' })
  }

  if (errors.length > 0) {
    res.render('administrador/addedificio/addedificio', {
      errors, password_administrador
    })
  } else {

    //busco el edificio que tenga esa contraseña
    const filter = { password_administrador: password_administrador };
    const edificio = await Edificio.findOne(filter);
    //console.log(JSON.stringify(edificio, null, 2));

    // si no lo encuentra
    if (edificio == null) {
      errors.push({ text: 'Código erroneo, por favor intente nuevamente o contactese con nosotros.' })
      res.render('administrador/addedificio/addedificio', {
        errors,
      })
    } else {
      // si lo encuentra
      const edificio_id = edificio._id;


      // agrego el depto al usuario
      const update = { $push: { id_edificio_administrando: edificio_id } };
      const filter = { _id: userID };

      await User.findOneAndUpdate(filter, update, { new: true });

      req.flash('success_msg', 'Felicitaciones se ha agregado como administrador a su edificio');
      res.redirect('/administrador/selectedificio/');
    }

  }

});


  /////////////////////////////********* GENERAL ************ ///////////////////////////////////////

/// seleccionar el depto a utilizar //
router.get('/administrador/selectedificio/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);

  id_edificio_administrando = req.user.id_edificio_administrando;

  // busco los deptos de la torre
  const queryMatchFilter = { '_id': { '$in': id_edificio_administrando } }
  const Edificios = await Edificio.find(queryMatchFilter).lean();

  res.render('administrador/general/selectedificio', {
    Edificios,
    helpers: {}
  })

})

/// seleccionar el depto a utilizar (aqui guardo el depto en la variable sesion) //
router.get('/administrador/selecteddepto/:id', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_edificio = mongoose.Types.ObjectId(req.params.id);
  req.session.current_edificio = id_edificio;

  res.redirect('/administrador/muro-residentes');
})

/////////////////////////////********* MURO RESIDENTES ************ //////////////////////////////////////////

/// muro de residentes //
router.get('/administrador/muro-residentes/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_edificio =  mongoose.Types.ObjectId(req.session.current_edificio);

  //obtengo info del edificio
  var edificio_info = await Edificio.findById(id_edificio).lean()
    .then(data => {
      return {
        _id: data._id,
        edificio_nombre: data.edificio_nombre,

      }
    });

  //creo el user_info
  const user_info = { userID: userID, name: req.user.name }

  //esto es para el pagination
  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const limit = 15;

  //obtengo la info del muro de los residentes de este edificio
  var queryMatch_edificio = { 'user_edificio_id': id_edificio };
  const MuroResidenteQuestions = await MuroResidenteQuestion.aggregate([
    { $match: queryMatch_edificio },
    {
      $lookup: {
        from: "MuroResidentesAnswers",
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

  res.render('administrador/murores/muro-residentes', {
    user_info, MuroResidenteQuestions, edificio_info,
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
router.get('/administrador/muro-residentes/verquestion/:id_question', isAuthenticated, async (req, res) => {

  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_question = mongoose.Types.ObjectId(req.params.id_question);
  const id_edificio = req.session.current_edificio;

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


  res.render('administrador/murores/ver-question', {
    answers, question, userID,
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
router.put('/administrador/muro-residentes/doanswer/:id', isAuthenticated, async (req, res) => {

  const answer = req.body.new_answer;
  const id_edificio = req.session.current_edificio;
  const user_answer_id = mongoose.Types.ObjectId(req.user.id);
  const user_answer_nombre = req.user.name;
  const id_question = req.params.id;


  const errors = [];
  if (!answer) {
    errors.push({ text: 'Por favor escribe una respuesta o comentario' });
  }
  if (errors.length > 0) {
    res.redirect('/administrador/muro-residentes/ver-question/' + id_question, {
      errors,
    })
  } else {
    /// busco el id de la persona que hizo la pregunta 
    const question = await MuroResidenteQuestion.findById(req.params.id).lean()
      .then(data => {
        return {
          _id: data._id,
          user_id: data.user_id,
          user_nombre: data.user_nombre,
          user_edificio_nombre: data.user_edificio_nombre // el nombre del edificio siempre es el mismo del que hace la pregunta con el admin
        }
      })


    const user_question_id = question.user_id;
    const user_question_nombre = question.user_nombre;
    const user_edificio_nombre = question.user_edificio_nombre; // el nombre del edificio siempre es el mismo del que hace la pregunta con el admin
    const user_edificio_id = id_edificio;
    const id_question = question._id;

    const newAnswer = new MuroResidenteAnswer(
      {
        answer, user_answer_id, user_answer_nombre, user_question_id, user_question_nombre, id_question, user_es_admin: true, user_edificio_id: user_edificio_id, user_edificio_nombre: user_edificio_nombre
      });
    await newAnswer.save()
    req.flash('success_msg', 'Respuesta/comentario agregado correctamente');
    res.redirect('/administrador/muro-residentes/verquestion/' + id_question);

  }
})

/////////////////////////////********* MURO ADMINISTRADORES ************ //////////////////////////////////////////

/// muro de administradores //
router.get('/administrador/muro-admin/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_edificio = req.session.current_edificio;


  //obtengo info del edificio
  var edificio_info = await Edificio.findById(id_edificio).lean()
    .then(data => {
      return {
        _id: data._id,
        edificio_nombre: data.edificio_nombre,

      }
    });

  //creo el user_info
  const user_info = { userID: userID, name: req.user.name }

  //esto es para el pagination
  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const limit = 15;

  //obtengo la info del muro de los residentes de este edificio
  var queryMatch_edificio = { 'user_edificio_id': mongoose.Types.ObjectId(id_edificio) };
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

  res.render('administrador/muroadmin/muro-admin', {
    user_info, MuroAdminQuestions, edificio_info,
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

//////////// Muro administrador Escribir nueva publicación  /////////
router.get('/administrador/muro-admin/newquestion/', isAuthenticated, async (req, res) => {

  const id_edificio = req.session.current_edificio;

  res.render('administrador/muroadmin/new-question', {
    id_edificio,
    helpers: {}
  });
});

////// agregar publicacion administrador//////////
router.post('/administrador/muro-admin/addquestion', isAuthenticated, async (req, res) => {
  const id_edificio = req.session.current_edificio;
  const { title, description } = req.body;
  const errors = [];
  if (!title) {
    errors.push({ text: 'Please Write a Title' });
  }
  if (!description) {
    errors.push({ text: 'Please Write a Description' })
  }

  if (errors.length > 0) {
    res.render('administrador/murores/new-question', {
      errors,
      title,
      description
    })
  } else {
    const userID = mongoose.Types.ObjectId(req.user.id);
    const nameUser = req.user.name;

    //obtengo info del Edificio 
    var edificio_info = await Edificio.findById(id_edificio).lean()
      .then(data => {
        return {
          nombre: data.nombre,

        }
      });

    // agrego la Pregunta
    const newQuestion = new MuroAdminQuestion({
      title, description, user_edificio_id: id_edificio, user_edificio_nombre: edificio_info.nombre,  user_id: userID, user_nombre: nameUser,
    });
    await newQuestion.save()
    req.flash('success_msg', 'Publicación Agregada correctamente');
    res.redirect('/administrador/muro-admin/');
  }

});

/// ver pregunta //
router.get('/administrador/muro-admin/verquestion/:id_question', isAuthenticated, async (req, res) => {

  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_question = mongoose.Types.ObjectId(req.params.id_question);
  const id_edificio = req.session.current_edificio;

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
    { $match: queryMatchAnswer }
  ]);
  console.log(JSON.stringify(answers, null, 2));

  res.render('administrador/muroadmin/ver-question', {
    answers, question, id_edificio,userID,
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
router.put('/administrador/muro-admin/doanswer/:id', isAuthenticated, async (req, res) => {

  const answer = req.body.new_answer;
  const id_edificio = mongoose.Types.ObjectId(req.session.current_edificio);
  const user_answer_id = mongoose.Types.ObjectId(req.user.id);
  const user_answer_nombre = req.user.name;
  const id_question = mongoose.Types.ObjectId(req.params.id);


  const errors = [];
  if (!answer) {
    errors.push({ text: 'Por favor escribe una respuesta o comentario' });
  }
  if (errors.length > 0) {
    res.redirect('/administrador/muro-admin/ver-question/' + id_question, {
      errors,
    })
  } else {
    /// busco el id de la persona que hizo la pregunta 
    const question = await MuroAdminQuestion.findById(id_question).lean()
      .then(data => {
        return {
          _id: data._id,
          user_id: data.user_id,
          user_nombre: data.user_nombre
        }
      })

    //obtengo info del edificio 
    var edificio_info = await Edificio.findById(id_edificio).lean()
      .then(data => {
        return {
          nombre: data.nombre,
        }
      });

    const user_question_id = question.user_id;
    const user_question_nombre = question.user_nombre;

    const newAnswer = new MuroAdminAnswer(
      {
        answer, user_answer_id, user_answer_nombre, user_question_id, user_question_nombre, id_question, user_es_admin: true, user_edificio_id: id_edificio, user_edificio_nombre: edificio_info.nombre
      });
    await newAnswer.save()
    req.flash('success_msg', 'Respuesta/comentario agregado correctamente');
    res.redirect('/administrador/muro-admin/verquestion/' + id_question);

  }
})

/////////eliminar pregunta/////
router.get('/administrador/muro-admin/deletequestion/:id', isAuthenticated, async (req, res) => {

  await MuroAdminQuestion.findByIdAndDelete(req.params.id)
  req.flash('success_msg', 'La publicación fue eliminada correctamente');
  res.redirect('/administrador/muro-admin/');

});



/////////////////////////////********* ENCUESTAS************ //////////////////////////////////////////

/// Encuestas //
router.get('/administrador/encuestas/', isAuthenticated, async (req, res) => {
  const userID = mongoose.Types.ObjectId(req.user.id);
  const id_edificio = req.session.current_edificio;


  //obtengo info del edificio
  var edificio_info = await Edificio.findById(id_edificio).lean()
    .then(data => {
      return {
        _id: data._id,
        edificio_nombre: data.edificio_nombre,

      }
    });

  //creo el user_info
  const user_info = { userID: userID, name: req.user.name }

  //esto es para el pagination
  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const limit = 15;

  //obtengo la info del encuestas de este edificio
  var queryMatch_edificio = { 'user_edificio_id': mongoose.Types.ObjectId(id_edificio)};
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

  console.log(JSON.stringify(id_edificio, null, 2));


  res.render('administrador/encuestas/muro-encuestas', {
    user_info, EncuestaQuestions, edificio_info,
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
router.get('/administrador/encuestas/newquestion/', isAuthenticated, async (req, res) => {

  const id_depto = req.session.current_depto;

  res.render('administrador/encuestas/new-question', {
    id_depto,
    helpers: {}
  });
});

///// Crear nueva encuesta ///////
router.post('/administrador/encuestas/newquestion/', isAuthenticated, async (req, res) => {
  const id_edificio = req.session.current_edificio;
  const title = req.body.pregunta;
  const opciones = req.body.tagsArray;
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
    res.render('administrador/encuestas/new-question', {
      errors,
      title
    })
    
  } else {

     //obtengo info del Edificio 
     var edificio_info = await Edificio.findById(id_edificio).lean()
     .then(data => {
       return {
         nombre: data.nombre,

       }
     });
      console.log(JSON.stringify(edificio_info, null, 2));

    const newAnswer = new EncuestaQuestion(
      {
        title, opciones,  user_id, user_nombre, user_es_admin: true, user_edificio_id: id_edificio, user_edificio_nombre: edificio_info.nombre
      });
    await newAnswer.save()
    req.flash('success_msg', 'Encuesta agregada correctamente');
    res.redirect('/administrador/encuestas/');

  }
})

/////////eliminar encuesta/////
router.get('/administrador/encuestas/deleteencuesta/:id', isAuthenticated, async (req, res) => {

  await EncuestaQuestion.findByIdAndDelete(req.params.id)
  req.flash('success_msg', 'La encuesta fue eliminada correctamente');
  res.redirect('/administrador/encuestas/');

});


module.exports = router;