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
const datefns = require('date-fns');


/// dashboard para  mantener el orden al sacar dinero de paypal
router.get('/admin/dashboard-transfer', isAuthenticated, async (req, res) => {

  const id_user = mongoose.Types.ObjectId(req.user.id);

  const user_data = await User.findById(id_user).lean()
    .then(data => {
      return {
        _id: data._id,
        admin: data.admin
      }
    });
  if (user_data.admin) {

    const questions = await Question.aggregate([
      {
        "$group": {
          "_id": null,
          "total_price_question": { "$sum": "$total_price_question" },
          "reward_offered_not_paid": {
            "$sum": {
              "$cond": [
                {
                  "$and": [
                    { "$eq": ["$answers_enabled", true] }, { "$eq": ["$best_answer_chosen", false] }]
                },
                "$reward_offered", 0]
            }
          },
          "total_paid_to_priceanswers": {
            "$sum": { "$cond": [{ "$eq": ["$answers_enabled", true] }, "$total_price_question", 0] }
          },
          "total_reward_answers_enabled": {
            "$sum": { "$cond": [{ "$eq": ["$answers_enabled", true] }, "$reward_offered", 0] }
          },
          "count_total_questions_enabled": {
            "$sum": { "$cond": [{ "$eq": ["$answers_enabled", true] }, 1, 0] }
          }
        },

      }
    ])
    // total gastado en tarifa de paypal por todos los pagos que me han realizado hacia priceanswers (habilitar respuestas de la pregunta)
    // primero es el 0.3 fijo de cada pago y luego lo sumo con el 5.4% 
    var paypal_import_fixed_rate = 0.3 * parseFloat(questions[0].count_total_questions_enabled);
    var fee_paypal_import = parseFloat(questions[0].total_paid_to_priceanswers) * 0.054 + paypal_import_fixed_rate;
    // total gastado en tarifa de paypal para el pago de la recompensa (pago mio hacia usuario)
    var fee_paypal_export = parseFloat(questions[0].total_reward_answers_enabled) * 0.02;
    //utilidad total de la página
    var total_utility = parseFloat(questions[0].total_paid_to_priceanswers) - parseFloat(questions[0].total_reward_answers_enabled) - fee_paypal_export - fee_paypal_import;
    //deuda que tengo hacia los usuarios (dinero que debería de tener para pagar todos los reward de las preguntas que estan con answers_enabled)
    var reward_fee_debt = parseFloat(questions[0].reward_offered_not_paid) + parseFloat(questions[0].reward_offered_not_paid) * 0.02;
    // utilidad actual 
    var current_utility = total_utility;
    // dinero total sacado de la cuenta 
    var total_taken_utility = 0;
    // ultimo dinero sacado de la cuenta 
    var current_taken_utility = 0;

    //console.log(JSON.stringify(questions, null, 2));


    const all_transfers = await Transfer.find({}).sort({ 'createdAt': -1 }).lean();


    if (all_transfers.length > 0) {

      total_taken_utility = parseFloat(all_transfers[0].total_taken_utility);
      current_utility = parseFloat(total_utility) - parseFloat(total_taken_utility);
      current_taken_utility = parseFloat(all_transfers[0].current_taken_utility);
    }
    //console.log(JSON.stringify(all_transfers, null, 2));



    res.render('admin/dashboard-transfer', {
      all_transfers: all_transfers, fee_paypal_import_last: fee_paypal_import, fee_paypal_export_last: fee_paypal_export, total_utility_last: total_utility, reward_fee_debt_last: reward_fee_debt, current_utility_last: current_utility, total_taken_utility_last: total_taken_utility, current_taken_utility_last: current_taken_utility,
      helpers: {
        formatDate: function (date) {
          return datefns.formatRelative(date, new Date());
        },
        parsefloat2: function (number) {
          return parseFloat(number).toFixed(2);
        }
      }
    }
    );
  }
  else {
    res.redirect('/');
  }

});

router.put('/admin/dashboard-transfer', isAuthenticated, async (req, res) => {


  const id_user = mongoose.Types.ObjectId(req.user.id);

  const user_data = await User.findById(id_user).lean()
    .then(data => {
      return {
        _id: data._id,
        admin: data.admin
      }
    });
  if (!user_data.admin) { res.redirect('/'); }


  const { utility_taken_input, description } = req.body;

  const questions = await Question.aggregate([
    {
      "$group": {
        "_id": null,
        "total_price_question": { "$sum": "$total_price_question" },
        "reward_offered_not_paid": {
          "$sum": {
            "$cond": [
              {
                "$and": [
                  { "$eq": ["$answers_enabled", true] }, { "$eq": ["$best_answer_chosen", false] }]
              },
              "$reward_offered", 0]
          }
        },
        "total_paid_to_priceanswers": {
          "$sum": { "$cond": [{ "$eq": ["$answers_enabled", true] }, "$total_price_question", 0] }
        },
        "total_reward_answers_enabled": {
          "$sum": { "$cond": [{ "$eq": ["$answers_enabled", true] }, "$reward_offered", 0] }
        },
        "count_total_questions_enabled": {
          "$sum": { "$cond": [{ "$eq": ["$answers_enabled", true] }, 1, 0] }
        }
      },

    }
  ])
  // total gastado en tarifa de paypal por todos los pagos que me han realizado hacia priceanswers (habilitar respuestas de la pregunta)
  // primero es el 0.3 fijo de cada pago y luego lo sumo con el 5.4% 
  const paypal_import_fixed_rate = 0.3 * parseFloat(questions[0].count_total_questions_enabled);
  const fee_paypal_import = parseFloat(questions[0].total_paid_to_priceanswers) * 0.054 + paypal_import_fixed_rate;
  // total gastado en tarifa de paypal para el pago de la recompensa (pago mio hacia usuario)
  const fee_paypal_export = parseFloat(questions[0].total_reward_answers_enabled) * 0.02;
  //utilidad total de la página
  const total_utility = parseFloat(questions[0].total_paid_to_priceanswers) - parseFloat(questions[0].total_reward_answers_enabled) - fee_paypal_export - fee_paypal_import;
  //deuda que tengo hacia los usuarios (dinero que debería de tener para pagar todos los reward de las preguntas que estan con answers_enabled)
  const reward_fee_debt = parseFloat(questions[0].reward_offered_not_paid) + parseFloat(questions[0].reward_offered_not_paid) * 0.02;
  // utilidad actual 
  var current_utility = total_utility;
  // dinero total sacado de la cuenta 
  var total_taken_utility = 0;
  // ultimo dinero sacado de la cuenta 
  var current_taken_utility = 0;

  //console.log(JSON.stringify(questions, null, 2));
  console.log("fee_paypal_import: " + fee_paypal_import);
  console.log("fee_paypal_export: " + fee_paypal_export);
  console.log("utility: " + total_utility);
  console.log("reward_fee_debt: " + reward_fee_debt);

  const all_transfers = await Transfer.find({}).sort({ 'createdAt': -1 });


  if (all_transfers.length > 0) {

    total_taken_utility = parseFloat(all_transfers[0].total_taken_utility);
    current_utility = parseFloat(total_utility) - parseFloat(total_taken_utility);
    current_taken_utility = parseFloat(all_transfers[0].current_taken_utility);
  }
  var current_utility_new = parseFloat(current_utility) - parseFloat(utility_taken_input);
  var total_taken_utility = parseFloat(total_taken_utility) + parseFloat(utility_taken_input);


  const newTransfer = new Transfer({ fee_paypal_import, fee_paypal_export, total_utility, current_utility: current_utility_new, total_taken_utility, current_taken_utility: utility_taken_input, reward_fee_debt, description });
  await newTransfer.save()

  req.flash('success_msg', 'Profile Updated Successfully');
  res.redirect('/admin/dashboard-transfer');

})

// dashboard para transferir dinero a los mejores respuestas
router.get('/admin/best_answers', isAuthenticated, async (req, res) => {

  const id_user = mongoose.Types.ObjectId(req.user.id);

  const user_data = await User.findById(id_user).lean()
    .then(data => {
      return {
        _id: data._id,
        transaction_manager: data.transaction_manager
      }
    });
  if (user_data.transaction_manager) {

    const queryMatchPendingPaid = { 'status': 'best_answer_chosen' };
    const queryMatchBestAnswer = { 'best_answer': true };

    const questions = await Question.aggregate([
      { $match: queryMatchPendingPaid },
      {
        $lookup: {
          from: "answers",
          let: { "questionid": "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$id_question", "$$questionid"] } } },
            { $match: queryMatchBestAnswer },
            { $project: { "answer": 0, "createdAt": 0, "rating_by": 0, "answerRating": 0 } },
            {
              $lookup: {
                from: "users",
                let: { "user_id": "$user_answer" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
                  { $project: { "password": 0, "createdAt": 0, "answerRating": 0 } }
                ],
                as: "user_info"
              }
            }
          ],
          as: "answer_info"
        }
      },
      { $project: { "title": 0, "description": 0, "rating_by": 0, "img": 0, "tags": 0, "user_question": 0 } },
      { $sort: { createdAt: -1 } },
      /* { $skip: skip * limit },
       { $limit: limit } */

    ]);

    //console.log(JSON.stringify(questions, null, 2));

    res.render('admin/transaction-best-answer', {
      questions,
      helpers: {
        formatDate: function (date) {
          return datefns.formatRelative(date, new Date());
        },
        parsefloat2: function (number) {
          return parseFloat(number).toFixed(2);
        }
      }
    }
    );

  } else {
    res.redirect('/');
  }
})

router.put('/admin/update_best_answer', isAuthenticated, async (req, res) => {

  const id_user = mongoose.Types.ObjectId(req.user.id);

  const { paypal_transaction_id } = req.body;
  const id_answer = mongoose.Types.ObjectId(req.body.id_answer);
  const id_question = mongoose.Types.ObjectId(req.body.id_question);
  const user_data = await User.findById(id_user).lean()
    .then(data => {
      return {
        _id: data._id,
        transaction_manager: data.transaction_manager
      }
    });
  if (user_data.transaction_manager) {

    const filterAnswer = { _id: id_answer };
    const updateAnswer = { get_paid: true, paypal_transaction_id: paypal_transaction_id };

    const filterQuestion = { _id: id_question };
    const updateQuestion = { status: 'answer_paid' };
    // modifico la respuesta
    const answer = await Answer.findOneAndUpdate(filterAnswer, updateAnswer, { new: true });

    //modifico la pregunta y obtengo el reward offered
    var reward_offered;
    const question = await Question.findOneAndUpdate(filterQuestion, updateQuestion, { new: true }).lean().then(answerVar => {
      reward_offered = answerVar.reward_offered;
    });

  /////// obtengo los datos del usuario elegido como la mejor respuesta (paypal_email)  ///////
  const user_answer = await User.findById(id_answer).lean()
    .then(data => {
      return {
        _id: data._id,
        paypal_email: data.paypal_email,
        email: data.email
      }
    });

    const email_user_priceanswers = user_answer.email;
  const paypal_email = user_answer.paypal_email;

    
    /// envío correo de invoice al user_answer ///
    ///// POR AHORA ESTARÁ APAGADO YA QUE PAYPAL ENVIA INVOICE

    const datenow = datefns.formatRelative(Date.now(), new Date());

    const firstPartEmailUser = email_user_priceanswers.split('@')[0];

    // Generate test SMTP service account from ethereal.email
    // create reusable transporter object using the default SMTP transport
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
        layoutsDir: path.join(__dirname, '../views/emailtemplates/invoicepaidanswer'), // location of handlebars templates
        defaultLayout: 'html', // name of main template
        partialsDir: path.join(__dirname, '../views/emailtemplates/invoicepaidanswer'), // location of your subtemplates aka. header, footer etc
      },
      viewPath: path.join(__dirname, '../views/emailtemplates/invoicepaidanswer'),
      extName: '.hbs'
    };

    transporter.use('compile', hbs(options));

    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: 'contact@priceanswers.com', // sender address
      to: email_user_priceanswers, // list of receivers
      subject: "Invoice Priceanswers", // Subject line
      template: 'html',
      context: {
        name: firstPartEmailUser,
        datenow: datenow,
        idQuestion: id_question.toString(),
        reward_offered: reward_offered

      }
    }).catch(console.error);



    res.redirect('/admin/best_answers');

  } else {
    res.redirect('/');
  }


})

module.exports = router;