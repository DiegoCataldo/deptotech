const express = require('express')
const router =express.Router(); //me permite crear rutas

router.get('/', (req, res)=>{
  res.render('index.hbs', {layout: 'main-index'});
})

router.get('/about', (req, res)=>{
  res.render('about.hbs');
})

module.exports = router;