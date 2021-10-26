

$(function () {


  $('.trumbowyg-textarea').trumbowyg({

    btns: [
      ['highlight'],
      ['viewHTML'],
      ['formatting'],
      ['strong', 'em', 'del'],
      ['justifyLeft', 'justifyCenter'],
      ['superscript', 'subscript'],
        ['link'],
        ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
        ['unorderedList', 'orderedList'],
        ['horizontalRule'],
        ['removeformat'],
        ['fullscreen']
      
  ]
  });

  $('#myModal').modal('show');

paypal.use( ['login'], function (login) {
  login.render ({
    "appid":"AY-Pud-9fb5-xD8hTzYsFqv0x_a0QTaQY9g5Th47pHqZrCAVIIzV259K5fQ4569xuuuVs2NffkgQJdEa",
    "authend":"sandbox",
    "scopes":"openid email https://uri.paypal.com/services/paypalattributes ",
    "containerid":"lippButton",
    "responseType":"code",
    "locale":"en-us",
    "buttonType":"LWP",
    "buttonShape":"pill",
    "buttonSize":"lg",
    "fullPage":"true",
    "returnurl":"https://www.priceanswers.com/paypal/return"
  });
});

  let elmButton = document.querySelector("#addcustomerbutton");
  // botón para agregar un nuevo costumer en connect de stripe y que pueda recibir plata al responder
if (elmButton) {
  elmButton.addEventListener(
    "click",
    e => {
      elmButton.setAttribute("disabled", "disabled");
      elmButton.textContent = "Opening...";

      fetch("/stripeaccount/addcustomerbutton", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })
        .then(response => response.json())
        .then(data => {
          if (data.url) {
            window.location = data.url;
          } else {
            elmButton.removeAttribute("disabled");
            elmButton.textContent = "<Something went wrong>";
            console.log("data", data);
          }
        });
    },
    false
  );
}

  $('#Modal').modal('show');

  $(".navbar-toggler").on("click", function (e) {
    $(".tm-header").toggleClass("show");
    e.stopPropagation();
  });

  $("html").click(function (e) {
    var header = document.getElementById("tm-header");

    if (!header.contains(e.target)) {
      $(".tm-header").removeClass("show");
    }
  });

  $("#tm-nav .nav-link").click(function (e) {
    $(".tm-header").removeClass("show");
  });

  $(".button-best-answer").on("click", function (e) {

    var answer = confirm("Are you sure this is the best answer? this user will be the only one who will receive the reward of the question");
    if (answer) {
      return true;
    } else {
      e.preventDefault();
    }
  });

  // para que no se vea toda la descripción de la pregunta y aparezca el botón more and less
$('.body-question-description').each(function(e) {

    var $pTag = $(this).find('p');
    console.log($pTag.text());
    if($pTag.text().length > 100){
        var shortText = $pTag.text();
        shortText = shortText.substring(0, 100);
        $pTag.addClass('fullArticle').hide();
        shortText += '<a href="#" class="read-more-link">Read More</a>';
        $pTag.append('<a href="#" class="read-less-link">Show less</a>');
        $(this).append('<p class="preview">'+shortText+'</p>');
    }

});

$(document).on('click', '.read-more-link', function () {
  $(this).parent().hide().prev().show();
});

$(document).on('click', '.read-less-link', function () {
  $(this).parent().hide().next().show();
});

/// cerrar el dialogo de alerta //
  $("#alertbutton").click(function (e) {
    console.log(e);
    $(".alert").fadeOut();
  });
});

// eliminar los tags que se están agregando al hacer click en la x //
$('body').on('click', 'i.cross', function () {
  console.log("entro");
  var removedItem = $(this).parent().contents(':not(i)').text();
  $(this).parent().remove();
  tags = $.grep(tags, function (value) {
    return value != removedItem;
  });
});
 /// agregar tags //
$(".tag-input").keyup(function (e) {
  var code = e.key; // recommended to use e.key, it's normalized across devices and languages
  if (code === "Enter") e.preventDefault();
  var tagsLenght = $('input[name="tagsArray"]').length;

  if (code === "Enter") {

    if (e.which === 13 && tagsLenght <= 5) {
      $(".tags-added-container").append("<span href='#' class='tag-added'>" + this.value + ' <i class="fas fa-times cross"></i>' + " <input type='text' value='" + this.value + "' class='tag-hidden' name='tagsArray'/> </span>");

      tags.push(this.value);
      this.value = "";
      console.log(tags)
    } else {
      alert('you can only add a maximum of 6 tags');
    }
  }
});

//$('#priceanswers-reward').text($('#reward').val());

$('#reward').on('input', function() {

  //paso 1 obtener pago total (lo saco de la formula --> reward = x - x*0.054 -3 -x*0.05)
  var reward =  parseFloat($('#reward').val());
  var total_pay = (reward+0.3)/0.846;

var priceanswers_fee = total_pay*0.08;
priceanswers_fee =parseFloat(priceanswers_fee).toFixed(2);
var paypal_fee = total_pay*0.074 + 0.3;
paypal_fee =parseFloat(paypal_fee).toFixed(2);
 reward = parseFloat( $('#reward').val()).toFixed(2);

priceanswers_fee =parseFloat(priceanswers_fee);
paypal_fee =parseFloat(paypal_fee);
reward = parseFloat( reward);

var total = reward +  paypal_fee + priceanswers_fee;

total =parseFloat(total).toFixed(2);
total = total+ ' USD';
priceanswers_fee = priceanswers_fee+ ' USD';
paypal_fee = paypal_fee+ ' USD';




  $('#priceanswers-reward').text(priceanswers_fee);
  $('#paypal-reward').text(paypal_fee);
  $('#total-reward').text(total);


});

var tags = [];
$(document).ready(function () {

  $('#example').DataTable();
  
  // subir imagenes //
  const fileSelector = document.getElementById('inputGroupFile01');
  fileSelector.addEventListener('change', (event) => {

    var file = $('#inputGroupFile01')[0].files[0].name;
    console.log(file);
    $(this).next('label').text(file);

    document.getElementById('label-inputGroupFile01').val(file);

  });
  $('#reward').on('input', function() {
    console.log('tes');
   });
 

  $('body').on('click', 'i.cross', function () {
    console.log("entro");
    var removedItem = $(this).parent().contents(':not(i)').text();
    $(this).parent().remove();
    tags = $.grep(tags, function (value) {
      return value != removedItem;
    });
  });


  $(".button-best-answer").on("click", function (e) {

    var answer = confirm("Are you sure this is the best answer? this user will be the only one who will receive the reward of the question");
    if (answer) {
      return true;
    } else {
      e.preventDefault();
    }
  });


});

$(document).on("keydown", ":input:not(textbox)", function (event) {


  var classe =  $(event.target).attr('class');

  if(classe == "tag-input" || classe.indexOf("tag-input") !== -1){
    return event.key != "Enter";
  }

});


// agregar rating a las respuestas //
function addRatingAnswerAjax(p_idanswer, p_rating) {

  document.getElementById('1_' + p_idanswer).disabled = true;
  document.getElementById('2_' + p_idanswer).disabled = true;
  document.getElementById('3_' + p_idanswer).disabled = true;
  document.getElementById('4_' + p_idanswer).disabled = true;
  document.getElementById('5_' + p_idanswer).disabled = true;


  $.ajax({
    url: '/questions/add_rating/' + p_idanswer + '&' + p_rating,
    success: function (json) {
      console.log('success');
    }
  });
}


// Loop on each calendar initialized
calendars.forEach(calendar => {
  // Add listener to select event
  calendar.on('select', date => {
    console.log(date);
  });
});

const fileSelector = document.getElementById('inputGroupFile01');
fileSelector.addEventListener('change', (event) => {
  console.log("entro");
  const fileList = event.target.files;
  console.log(fileList);
  $("#label-inputGroupFile01").val(fileList);

}); 





