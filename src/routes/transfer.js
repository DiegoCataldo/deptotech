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
    console.log("fee_paypal_import: " + fee_paypal_import);
    console.log("fee_paypal_export: " + fee_paypal_export);
    console.log("utility: " + total_utility);
    console.log("reward_fee_debt: " + reward_fee_debt);

    const all_transfers = await Transfer.find({}).sort({ 'createdAt': -1 }).lean();


    if (all_transfers.length > 0) {

      total_taken_utility = parseFloat(all_transfers[0].total_taken_utility);
      current_utility = parseFloat(total_utility) - parseFloat(total_taken_utility);
      current_taken_utility = parseFloat(all_transfers[0].current_taken_utility);
    }
    console.log(JSON.stringify(all_transfers, null, 2));



    res.render('users/dashboard-transfer', {
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

module.exports = router;