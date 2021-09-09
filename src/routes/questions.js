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
  if (errors.length > 0) {
    res.render('questions/new-question', {
      errors,
      title,
      description
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

  console.log(JSON.stringify(tagsArray, null, 2));
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

  // primero veo si en la bd está el account id de stripe para este usuario
  const user = await User.findById(req.user.id).lean();
    var stripeaccountID = user.stripe_account_id;

    const accountStripe = await stripe.accounts.retrieve(
      stripeaccountID
    ).catch(console.error)
  
  
      // en caso que no exista el account_id de stripe o si existe pero no tiene habilitado el payouts enabled lo redirecciono para que se registre en stripe
    if (typeof accountStripe === 'undefined' || accountStripe == null || accountStripe == '' || !accountStripe.payouts_enabled) {
      res.redirect('/stripeaccount/addcustomer');  return;
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
    console.log(question.best_answer_chosen)
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

  /*console.log(JSON.stringify(answers, null, 2)); */

  res.render('questions/see-own-question', {
    question, answers,
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

router.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'T-shirt',
          },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
  });

  res.redirect(303, session.url);
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
  const update = { best_answer: true }
  const filter = { _id: idanswer };

  //// modifico el Answer con la nueva puntuación ///
  var questionID;

  await Answer.findOneAndUpdate(filter, update, { new: true }).lean().then(answerVar => {

    /// ahora hago lo mismo con la puntuación del usuario ///
    questionID = answerVar.id_question;
    filterUser = { _id: questionID };
    updateUser = { best_answer_chosen: true };
  });
  await Question.findOneAndUpdate(filterUser, updateUser);
  req.flash('success_msg', 'Gracias por elegir la mejor respuesta');
  res.redirect('/questions/seeownquestion/' + questionID);

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