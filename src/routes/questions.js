const express = require('express')
const router = express.Router(); //me permite crear rutas
const mongoose = require('mongoose');

const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/Users');
const { isAuthenticated } = require('../helpers/auth');
const { updateMany } = require('../models/Question');
const datefns = require('date-fns');
const stripe = require("stripe")('sk_test_51Ibu5uDyfMeOA6sJnuFnlxOrrT2nR4nmhiFzrbNhEcNXGXzdRSF9lCGVD80dFk3RcXoAgpkyKRkQ7RORPjZ6lEiL00vRPvaymY');



//////////// Crear nueva pregunta /////////
router.get('/questions/add', isAuthenticated, (req, res) => {
  res.render('questions/new-question');
});

router.post('/questions/new-question', isAuthenticated, async (req, res) => {
  const { title, description, tagsArray, reward } = req.body;
  const errors = [];
  if (!title) {
    errors.push({ text: 'Please Write a Title' });
  }
  if (!description) {
    errors.push({ text: 'Please Write a Description' })
  }
  if (!reward) {
    errors.push({ text: 'Please Add a valid Reward' })
  }
  if (!tagsArray) {
    errors.push({ text: 'Please Add tags (press Enter to add it)' })
  }
  if (errors.length > 0) {
    res.render('questions/new-question', {
      errors,
      title,
      description,
      reward
    })
  } else {
    const newQuestion = new Question({ title, description, tags: tagsArray, reward_offered: reward, answers_enabled: false, best_answer_chosen: false });
    newQuestion.user_question = mongoose.Types.ObjectId(req.user.id);
    await newQuestion.save()
    req.flash('success_msg', 'Note Added Successfully');
    res.redirect('/questions/ownquestions')

  }
})

//////////////// PREGUNTAS DEL USUARIO sin filtro///////////////

router.get('/questions/ownquestions', isAuthenticated, async (req, res) => {

  const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
  const queryMatch = { 'user_question': idparamsObjectTypeID };
  const questions = await Question.aggregate([

    { $match: queryMatch },
    {
      $lookup: {
        from: "answers",
        let: { "questionid": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$id_question", "$$questionid"] } } },
          { $project: { "answer": 0, "createdAt": 0, "raging_by": 0, "answerRating": 0 } }
        ],
        as: "answers_info"
      }
    }
  ])

  res.render('questions/own-questions', {
    questions: questions,
    userInfo: { name: req.user.name },
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      }
    }
  })
})

//////////////// PREGUNTAS DEL USUARIO con filtro///////////////
router.post('/questions/ownquestionsfilter', isAuthenticated, async (req, res) => {

  var tagsArray = req.body.tagsArray;
  if (typeof tagsArray === 'string') {
    tagsArray = [tagsArray];
  }

  const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
  const queryMatch = { 'user_question': idparamsObjectTypeID };
  const queryMatchFilter = { 'tags': { '$in': tagsArray } }
  if (tagsArray == null) {

    const questions = await Question.aggregate([

      { $match: queryMatch },

      {
        $lookup: {
          from: "answers",
          let: { "questionid": "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$id_question", "$$questionid"] } } },
            { $project: { "answer": 0, "createdAt": 0, "raging_by": 0, "answerRating": 0 } }
          ],
          as: "answers_info"
        }
      }
    ]);
    res.render('questions/own-questions', {
      questions: questions,
      userInfo: { name: req.user.name },
      filters: tagsArray,
      helpers: {
        formatDate: function (date) {
          return datefns.formatRelative(date, new Date());
        },
        countLength: function (something) {
          return something.length;
        }
      }
    })
  } else {
    const questions = await Question.aggregate([

      { $match: queryMatch },
      { $match: queryMatchFilter },
      {
        $lookup: {
          from: "answers",
          let: { "questionid": "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$id_question", "$$questionid"] } } },
            { $project: { "answer": 0, "createdAt": 0, "raging_by": 0, "answerRating": 0 } }
          ],
          as: "answers_info"
        }
      }
    ]);
    res.render('questions/own-questions', {
      questions: questions,
      userInfo: { name: req.user.name },
      filters: tagsArray,
      helpers: {
        formatDate: function (date) {
          return datefns.formatRelative(date, new Date());
        },
        countLength: function (something) {
          return something.length;
        }
      }
    })
  }


})
///////////////// PREGUNTAS DE TODOS sin filtro /////////////////
router.get('/questions/allquestions/:skip?', isAuthenticated, async (req, res) => {

  var skip;
  if (typeof req.params.skip === 'undefined' || parseInt(req.params.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.params.skip);
  }
  const questions = await Question.aggregate([
    {
      $lookup: {
        from: "answers",
        let: { "questionid": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$id_question", "$$questionid"] } } },
          { $project: { "answer": 0, "createdAt": 0, "raging_by": 0, "answerRating": 0 } }
        ],
        as: "answers_info"
      }
    },
    { $skip: skip },
    { $limit: 15 }
  ]);

  const skipObject = { currentSkip: skip, nextSkip: skip + 1, prevSkip: skip - 1 };

  res.render('questions/all-questions', {
    questions: questions, skipObject: skipObject,
    userInfo: { name: req.user.name },
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      }
    }
  })

})
///////////////// PREGUNTAS DE TODOS con filtro /////////////////
router.post('/questions/allquestionsfilter', isAuthenticated, async (req, res) => {

  var tagsArray = req.body.tagsArray;
  var skip;
  if (typeof req.body.skip === 'undefined' || parseInt(req.body.skip) < 0) {
    skip = 0
  } else {
    skip = parseInt(req.body.skip);
  }

  if (typeof tagsArray === 'string') {
    tagsArray = [tagsArray];
  }

  if (tagsArray == null) {

    const questions = await Question.aggregate([
      {
        $lookup: {
          from: "answers",
          let: { "questionid": "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$id_question", "$$questionid"] } } },
            { $project: { "answer": 0, "createdAt": 0, "raging_by": 0, "answerRating": 0 } }
          ],
          as: "answers_info"
        }
      },
      { $skip: skip },
      { $limit: 15 }
    ])

    const skipObject = { currentSkip: skip, nextSkip: skip + 1, prevSkip: skip - 1 };

    res.render('questions/all-questions', {
      questions: questions, skipObject: skipObject,
      userInfo: { name: req.user.name },
      filters: tagsArray,
      helpers: {
        formatDate: function (date) {
          return datefns.formatRelative(date, new Date());
        },
        countLength: function (something) {
          return something.length;
        }
      }
    })
  } else {

    const queryMatch = { 'tags': { '$in': tagsArray } }

    const questions = await Question.aggregate([
      { $match: queryMatch },
      {
        $lookup: {
          from: "answers",
          let: { "questionid": "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$id_question", "$$questionid"] } } },
            { $project: { "answer": 0, "createdAt": 0, "raging_by": 0, "answerRating": 0 } }
          ],
          as: "answers_info"
        }
      },
      { $skip: skip },
      { $limit: 15 }
    ]);

    const skipObject = { currentSkip: skip, nextSkip: skip + 1, prevSkip: skip - 1 }

    res.render('questions/all-questions', {
      questions: questions, skipObject: skipObject,
      userInfo: { name: req.user.name },
      filters: tagsArray,
      helpers: {
        formatDate: function (date) {
          return datefns.formatRelative(date, new Date());
        },
        countLength: function (something) {
          return something.length;
        }
      }
    })

  }



})
/////// Obtener info de la pregunta a responder /////////
router.get('/questions/doanswer/:id', isAuthenticated, async (req, res) => {

  // primero veo si en la bd está el account id de paypal para este usuario
  const user = await User.findById(req.user.id).lean();
  var paypal_account_verified = user.paypal_account_verified;

  //en caso que el paypal account no esté verificado según la bd de priceanswers, lo reenvío para que se logee en paypal y para ver si está verificado
  if (typeof paypal_account_verified === 'undefined' || paypal_account_verified == null || !paypal_account_verified) {
    res.redirect('/paypal/addcustomer'); return;
  }
  /// obtengo la info de la pregunta ////
  const question = await Question.findById(req.params.id).lean()
    .then(data => {
      return {
        title: data.title,
        description: data.description,
        id: data._id,
        createdAt: data.createdAt,
        reward_offered: data.reward_offered,
        tags: data.tags,
        user_question: data.user_question,
        best_answer_chosen: data.best_answer_chosen
      }
    })

  /// obtengo la info del usuario que hico la pregunta ////
  const userQuestion = mongoose.Types.ObjectId(question.user_question);
  const queryMatch = { '_id': userQuestion };

  const userallInfo = await User.aggregate([
    { $match: queryMatch },
    {
      $lookup: {
        from: "questions",
        let: { "user_question": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$user_question", "$$user_question"] } } }
          // { $project: { "password": 0, "createdAt": 0, "email": 0 } }
        ],
        as: "user_questions"
      }
    }, {
      $lookup: {
        from: "answers",
        let: { "user_answer": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$user_answer", "$$user_answer"] } } }
          // { $project: { "password": 0, "createdAt": 0, "email": 0 } }
        ],
        as: "user_answers"
      }
    }
  ]);

  /// obtengo la info las respuestas a la pregunta ////
  const idparamsObjectTypeID = mongoose.Types.ObjectId(req.params.id);
  const queryMatchAnswer = { 'id_question': idparamsObjectTypeID };

  const answers = await Answer.aggregate([
    { $match: queryMatchAnswer },
    {
      $lookup: {
        from: "users",
        let: { "user_answer": "$user_answer" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$user_answer"] } } },
          { $project: { "password": 0, "createdAt": 0, "email": 0 } }
        ],
        as: "user_info"
      }
    }
  ])

  if (question.user_question == req.user.id) {
    req.flash('error', 'You cannot answer your own question');
    res.redirect('/questions/allquestions');
  } else {
    res.render('questions/do-answer', {
      question, userallInfo: userallInfo[0], answers: answers,
      helpers: {
        formatDate: function (date) {
          return datefns.formatRelative(date, new Date());
        },
        countLength: function (something) {
          return something.length;
        },
        countQuestionEnabled: function (something) {
          var count = 0;
          if (typeof something !== 'undefined') {

            for (var x of something) {
              if (x.answers_enabled) {
                count++;
              }
            }
          }
          return count;
        },
        ratingUserAVG: function (star1, star2, star3, star4, star5) {
          var totalRatings = star1 + star2 + star3 + star4 + star5;
          var percentageStar = (star1 * 1 + star2 * 2 + star3 * 3 + star4 * 4 + star5 * 5) / totalRatings;
          var percentageStarRounded = Math.round(percentageStar * 10) / 10;

          return percentageStarRounded;
        },
        isGreater: function (a, b, options) {
          return (a >= b) ? options.fn(this) : options.inverse(this);
        },
        log: function (something) {
          console.log(something);
        },
        json: function (something) {
          return JSON.stringify(something);
        },
        RatingEnabled: function (rating_by, options) {
          var FoundID = rating_by.find(function (doc, index) {

            if (doc.idUser == req.user.id) {
              return true;
            } else {
              return false;
            }
          });
          if (FoundID) { return options.fn(this); } else { return options.inverse(this); }
        },
        ifExist: function (variable, options) {
          return (variable != null) ? options.fn(this) : options.inverse(this);
        }
      }
    })
  }

});


////  VER respuestas de una pregunta propia /////////
router.get('/questions/seeownquestion/:id', isAuthenticated, async (req, res) => {

  // busco los datos de la pregunta //
  const question = await Question.findById(req.params.id).lean()
    .then(data => {
      return {
        title: data.title,
        description: data.description,
        id: data._id,
        createdAt: data.createdAt,
        reward_offered: data.reward_offered,
        tags: data.tags,
        answers_enabled: data.answers_enabled,
        best_answer_chosen: data.best_answer_chosen

      }
    })

  const userQuestion = mongoose.Types.ObjectId(req.user.id);
  const queryMatchUserInfo = { '_id': userQuestion };

  const userallInfo = await User.aggregate([
    { $match: queryMatchUserInfo },
    {
      $lookup: {
        from: "questions",
        let: { "user_question": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$user_question", "$$user_question"] } } }
          // { $project: { "password": 0, "createdAt": 0, "email": 0 } }
        ],
        as: "user_questions"
      }
    }, {
      $lookup: {
        from: "answers",
        let: { "user_answer": "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$user_answer", "$$user_answer"] } } }
          // { $project: { "password": 0, "createdAt": 0, "email": 0 } }
        ],
        as: "user_answers"
      }
    }
  ]);

  // busco los datos de cada respuesta a la pregunta
  const idparamsObjectTypeID = mongoose.Types.ObjectId(req.params.id);
  const queryMatch = { 'id_question': idparamsObjectTypeID };

  const answers = await Answer.aggregate([
    { $match: queryMatch },
    {
      $lookup: {
        from: "users",
        let: { "user_answer": "$user_answer" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$user_answer"] } } },
          { $project: { "password": 0, "createdAt": 0, "email": 0 } }
        ],
        as: "user_info"
      }
    }
  ])

  res.render('questions/see-own-question', {
    question, answers, userallInfo: userallInfo[0],
    helpers: {
      ratingUserAVG: function (star1, star2, star3, star4, star5) {
        var totalRatings = star1 + star2 + star3 + star4 + star5;
        var percentageStar = (star1 * 1 + star2 * 2 + star3 * 3 + star4 * 4 + star5 * 5) / totalRatings;
        var percentageStarRounded = Math.round(percentageStar * 10) / 10;

        return percentageStarRounded;
      },
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      isGreater: function (a, b, options) {
        return (a >= b) ? options.fn(this) : options.inverse(this);
      },
      log: function (something) {
        return console.log(JSON.stringify(something, null, 2));
      },
      json: function (something) {
        return console.log(JSON.stringify(something, null, 2));

      },
      RatingEnabled: function (rating_by, options) {
        var FoundID = rating_by.find(function (doc, index) {

          if (doc.idUser == req.user.id) {
            return true;
          } else {
            return false;
          }
        });
        if (FoundID) { return options.fn(this); } else { return options.inverse(this); }
      },
      ifExist: function (variable, options) {
        return (variable != null) ? options.fn(this) : options.inverse(this);
      },
      countLength: function (something) {
        return something.length;
      },
      countQuestionEnabled: function (something) {

        var count = 0;
        if (typeof something !== 'undefined') {

          for (var x of something) {
            if (x.answers_enabled) {
              count++;
            }
          }
        }
        return count;
      },
    }
  })
});


///// crear respuesta a una pregunta ///////
router.put('/questions/doanswer/:id', isAuthenticated, async (req, res) => {

  const answer = req.body.new_answer;
  const user_answer = mongoose.Types.ObjectId(req.user.id);


  const errors = [];
  if (!answer) {
    errors.push({ text: 'Please Write a Answer' });
  }
  if (errors.length > 0) {
    res.render('questions/do-answer', { question }, {
      errors,
      //title,
      // description
    })
  } else {
    /// busco el id de la persona que hizo la pregunta 
    const question = await Question.findById(req.params.id).lean()
      .then(data => {
        return {
          _id: data._id,
          user_question: data.user_question
        }
      })
    const user_question = question.user_question;
    const id_question = question._id;

    const newAnswer = new Answer(
      {
        answer, user_answer, user_question, id_question, best_answer: false, get_paid: false,
        answerRating: { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 }, rating_by: {}
      });
    await newAnswer.save()
    req.flash('success_msg', 'Answer Added Successfully');
    res.redirect('/questions/allquestions')

  }
})


////  Enviar a pagina de stripe para pagar y ver las respuestas /////////
router.get('/questions/enable_answers/:id', isAuthenticated, async (req, res) => {

  res.render('questions/enable-answers', { id_question: req.params.id });
})

///// actualizar la respuesta a enable answer despues de el pago ////////////
router.get('/questions/get_enable_answers/:id', isAuthenticated, async (req, res) => {

  const filter = { _id: req.params.id };
  const update = { answers_enabled: true };
  const question = await Question.findOneAndUpdate(filter, update, { new: true });

  res.redirect('/questions/seeownquestion/' + req.params.id)
});



///// Agregar una nueva puntuación (rating) a una respuesta ////////////
router.get('/questions/add_rating/:idanswer&:rating', isAuthenticated, async (req, res) => {

  const idanswer = mongoose.Types.ObjectId(req.params.idanswer);
  const rating = req.params.rating;
  var starName;
  // obtengo el nombre de la puntuación //
  if (rating == 1) {
    starName = "star1";
  } else if (rating == 2) {
    starName = "star2";
  } else if (rating == 3) {
    starName = 'star3';
  } else if (rating == 4) {
    starName = 'star4';
  } else if (rating == 5) {
    starName = 'star5';
  }
  // seteo las variables para definir la query de Answeer //
  var nameUpdate = 'answerRating.' + starName;
  const userID = mongoose.Types.ObjectId(req.user.id);
  const update = {
    $inc: { [nameUpdate]: 1 },
    $push: { rating_by: { idUser: userID, rating: rating } }
  }
  const filter = { _id: idanswer };


  //// modifico el Answer con la nueva puntuación ///

  var nameUpdateUser, userIDRating, user_answerID, filterUser, updateUser;

  await Answer.findOneAndUpdate(filter, update, { new: true }).lean().then(answerVar => {

    /// ahora hago lo mismo con la puntuación del usuario ///
    nameUpdateUser = 'answerRating.' + starName;
    userIDRating = mongoose.Types.ObjectId(req.user.id);
    user_answerID = answerVar.user_answer;
    filterUser = { _id: user_answerID };
    updateUser = {
      $inc: { [nameUpdateUser]: 1 },
      $push: { rating_by: { idUser: userIDRating, rating: rating } }
    }
  });
  await User.findOneAndUpdate(filterUser, updateUser);
  res.json([{ var: true }]);

})

///// Elegir como mejor respuesta ////////////
router.get('/questions/choose_best_answer/:idanswer', isAuthenticated, async (req, res) => {

  const idanswer = mongoose.Types.ObjectId(req.params.idanswer);

  ///// obtengo el id del usuario de la respuesta elegida como la mejor //////
  const answer = await Answer.findById(req.params.idanswer).lean()
    .then(data => {
      return {
        _id: data._id,
        user_question: data.user_question,
        user_answer: data.user_answer,
        id_question: data.id_question
      }
    })

  const id_question = answer.id_question;
  /////// obtengo los datos de la pregunta ///////
  const question = await Question.findById(id_question).lean()
  .then(data => {
    return {
      _id: data._id,
      reward_offered: data.reward_offered
    }
  });
  const reward_offered = question.reward_offered;

  /////// obtengo los datos del usuario elegido como la mejor respuesta ///////
  const user_answer = await User.findById(answer.user_answer).lean()
    .then(data => {
      return {
        _id: data._id,
        stripe_account_id: data.stripe_account_id,
        paypal_email: data.paypal_email,
      }
    });


  if (user_answer.stripe_account_id == null) {
    req.flash('success_msg', 'Gracias por elegir la mejor respuesta');
    res.redirect('/questions/seeownquestion/' + id_question);
    return;
  
  } else {
      /////// si es que tiene stripe_account (cosa que debería ser si o si ya que si no no permite responder) /////
    const stripe_id_user = user_answer.stripe_account_id;

    var questionID, filterQuestion, updateAnswerChosen;

    /// le transfiero el dinero al usuario ///
    const transfer = await stripe.transfers.create({
      amount: reward_offered,
      currency: "usd",
      destination: stripe_id_user,
      receipt_email: user_answer.email
    });

    const update = { best_answer: true }
    const filter = { _id: idanswer };
    /// modifico la respuesta como la mejor //
    await Answer.findOneAndUpdate(filter, update, { new: true }).lean().then(answerVar => {

      /// obtengo los datos dela pregunta ///
      questionID = answerVar.id_question;
      filterQuestion = { _id: questionID };
      updateAnswerChosen = { best_answer_chosen: true };
    });
    //// modifico la pregunta  como la mejor respuesta ///
    await Question.findOneAndUpdate(filterQuestion, updateAnswerChosen);

    req.flash('success_msg', 'Gracias por elegir la mejor respuesta');
    res.redirect('/questions/seeownquestion/' + id_question);

  }


})

///// Ver todas mis respuestas realizadas ////////////

router.get('/questions/myanswers', isAuthenticated, async (req, res) => {

  const idparamsObjectTypeID = mongoose.Types.ObjectId(req.user.id);
  const queryMatch = { 'user_answer': idparamsObjectTypeID };

  const answers = await Answer.aggregate([

    { $match: queryMatch },
    {
      $lookup: {
        from: "questions",
        let: { "questionid": "$id_question" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$questionid"] } } }
          // { $project: { "answer": 0, "createdAt": 0, "raging_by": 0, "answerRating": 0 } }
        ],
        as: "question_info"
      }
    }
  ])

  res.render('questions/myanswers', {
    answers: answers,
    helpers: {
      formatDate: function (date) {
        return datefns.formatRelative(date, new Date());
      },
      countLength: function (something) {
        return something.length;
      }
    }
  })
})

/*
router.get('/notes/delete/:id',  isAuthenticated, async (req, res) => {

  await Note.findByIdAndDelete(req.params.id)
  req.flash('success_msg', 'Note Deleted Successfully');
  res.redirect('/notes');

});
*/




module.exports = router;