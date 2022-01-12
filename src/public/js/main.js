

$(function () {

  MathJax.Hub.Config({
    tex2jax: {
      inlineMath: [
        ['$', '$'],
        ['\\(', '\\)']
      ]
    }
  });

  $('.trumbowyg-textarea').trumbowyg({
    btnsDef: {
      // Customizables dropdowns
      /*	image: {
          dropdown: ['insertImage', 'upload'],
          ico: 'insertImage'
        } */
    },
    btns: [
      ['highlight'],
      ['fontsize'],
      ['viewHTML'],
      ['foreColor', 'backColor'],
      ['mathml']
      ['formatting'],
      ['strong', 'em', 'del'],
      ['superscript', 'subscript'],
      ['link'],
      ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
      ['unorderedList', 'orderedList'],
      ['horizontalRule'],
      ['removeformat'],
      ['fullscreen'],
      // ['image','noembed'],

    ],
    plugins: {
      fontsize: {
        sizeList: [
          '12px',
          '14px',
          '16px',
          '20px',
          '25px'
        ],
        allowCustomSize: false
      },
      highlight: {
        enableLineHighlight: false

      }
    }
  });

  $('#myModal').modal('show');

  /*
    $(".button-modal-transaction").click(function (e) {
      var myBookId = $(this).data('id');
      $(".modal-body #bookId").val( myBookId );
    });
  }); */



  $('#modal-transaction').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var id_question = button.data('idquestion');
    var id_answer = button.data('idanswer');
    var modal = $(this);
    //modal.find('.modal-title').text('New message to ' + recipient)
    modal.find('#id_question').val(id_question);
    modal.find('#id_answer').val(id_answer);
  });

  $('#modal-best-answer').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var id_answer = button.data('idanswer');
    var modal = $(this);
    //modal.find('.modal-title').text('New message to ' + recipient)

  });


  paypal.use(['login'], function (login) {
    login.render({
      "appid": "AZBsZtS53_tReLSnEsRXz_JkY5RY5hkQvG8mdirbLaDzK5973_3MCO0fnFx-QcgrQOjU3B8UYnZ1Qu4D",
      /*"authend": "sandbox", */
      "scopes": "openid email https://uri.paypal.com/services/paypalattributes ",
      "containerid": "lippButton",
      "responseType": "code",
      "locale": "en-us",
      "buttonType": "LWP",
      "buttonShape": "pill",
      "buttonSize": "lg",
      "fullPage": "true",
      "returnurl": "https://www.priceanswers.com/paypal/return"
    });
  });
  /*
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
  }*/



  $(".navbar-toggler").on("click", function (e) {
    $(".tm-header").toggleClass("show");
    e.stopPropagation();
  });

  $("html").click(function (e) {
    var header = document.getElementById("tm-header");
    if (typeof header != "undefined" && header != null) {
      if (!header.contains(e.target)) {
        $(".tm-header").removeClass("show");
      }
    }

  });

  $("#tm-nav .nav-link").click(function (e) {
    $(".tm-header").removeClass("show");
  });
  /*
    $(".button-best-answer-alert").on("click", function (e) {
  
      var answer = confirm("Are you sure this is the best answer? this user will be the only one who will receive the reward of the question");
      if (answer) {
        return true;
      } else {
        e.preventDefault();
      }
    });
  */
  $(".button-delete-question").on("click", function (e) {

    var answer = confirm("Are you sure you want to eliminate this question? It will be permanently deleted along with the responses associated with it.");
    if (answer) {
      return true;
    } else {
      e.preventDefault();
    }
  });

  $(".button-add-tags").on("click", function (e) {
    var tagsLenght = $('input[name="tagsArray"]').length;
    var input = $('input[name="tags-id"]').val();
    console.log(input);
    if (tagsLenght <= 5) {
      $(".tags-added-container").append("<span href='#' class='tag-added'>" + input + ' <i class="fas fa-times cross"></i>' + " <input type='text' value='" + input + "' class='tag-hidden' name='tagsArray'/> </span>");

      tags.push(input);
      input = "";
      //console.log(tags)
    } else {
      alert('you can only add a maximum of 6 tags');
    }

  });

  // para que no se vea toda la descripción de la pregunta y aparezca el botón more and less
  /*
  $('.body-question-description').each(function (e) {

    var $pTag = $(this).find('p');
    var $preTag = $(this).find('pre');
    console.log($pTag.text());
    console.log($preTag.text());
    var addtagtext = $pTag.text().length + $preTag.text().length;

    if (addtagtext > 100) {
      var shortText = $pTag.text();
      shortText = shortText.substring(0, 100);
      $pTag.addClass('fullArticle').hide();
      shortText += '<a href="#" class="read-more-link">Read More</a>';
      $pTag.append('<a href="#" class="read-less-link">Show less</a>');
      $(this).append('<p class="preview">' + shortText + '</p>');
    }

  });
*/
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

  $("#bestanswercheckbox").on("click", function (e) {

    //var test = document.getElementById('bestanswercheckbox:checked').val();
    var checkboxoriginal = $("#bestanswercheckbox").is(":checked");
    if (checkboxoriginal) {
      $('#bestanswercheckbox1').prop('checked', true);
      $('#bestanswercheckbox2').prop('checked', true);
    } else {
      $('#bestanswercheckbox1').prop('checked', false);
      $('#bestanswercheckbox2').prop('checked', false);
    }


    console.log(checkboxoriginal);

  });
});


// eliminar los tags que se están agregando al hacer click en la x //
$('body').on('click', 'i.cross', function () {
  var removedItem = $(this).parent().contents(':not(i)').text();
  $(this).parent().remove();
  tags = $.grep(tags, function (value) {
    return value != removedItem;
  });
});
/// agregar tags //
/*
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
}); */

//$('#priceanswers-reward').text($('#reward').val());

$('#reward').on('blur', function () {


  //paso 1 obtener pago total (lo saco de la formula --> reward = x - x*0.1 -5 -x*0.12)
  var reward = parseFloat($('#reward').val());
  if (reward > 30 || reward < 3) {
    alert('Please Add a valid Reward (greater than 3 USD and less than 30 USD)');
    $('#reward').val('');
    return
  }
  // old var total_pay = (reward+0.3)/0.846;
  var total_pay = (reward + 0.5) / 0.78;

  var priceanswers_fee = total_pay * 0.12;
  priceanswers_fee = parseFloat(priceanswers_fee).toFixed(2);
  var paypal_fee = total_pay * 0.1 + 0.5;
  paypal_fee = parseFloat(paypal_fee).toFixed(2);
  reward = parseFloat($('#reward').val()).toFixed(2);

  priceanswers_fee = parseFloat(priceanswers_fee);
  paypal_fee = parseFloat(paypal_fee);
  reward = parseFloat(reward);

  var total = reward + paypal_fee + priceanswers_fee;

  total = parseFloat(total).toFixed(2);
  total = total + ' USD';
  priceanswers_fee = priceanswers_fee + ' USD';
  paypal_fee = paypal_fee + ' USD';




  $('#priceanswers-reward').text(priceanswers_fee);
  $('#paypal-reward').text(paypal_fee);
  $('#total-reward').text(total);


});

var tags = [];
$(document).ready(function () {

  if (navigator.connection && !!navigator.connection.effectiveType) {
    if (navigator.connection.effectiveType === '4g') {
      console.log('entro');
      const video1 = document.getElementById('video1');
      const videoSource1 = video1.getAttribute('data-src');
      video1.setAttribute('src', videoSource1);
      video1.setAttribute('poster', 'img/video3.jpg');
      
      const video2 = document.getElementById('video2');
      const videoSource2 = video2.getAttribute('data-src');
      video2.setAttribute('src', videoSource2);
      video2.setAttribute('poster', 'img/video4.jpg');
  
      const video3 = document.getElementById('video3');
      const videoSource3 = video3.getAttribute('data-src');
      video3.setAttribute('src', videoSource3);
      video2.setAttribute('poster', 'img/video5.jpg');

      //video.setAttribute('style', 'height: 100%; width: 100%; display:inline');
    } else {
      const image1 = document.getElementById('image1');
      const imageSource1 = image1.getAttribute('data-src');
      image1.setAttribute('src', imageSource1);

      const image2 = document.getElementById('image2');
      const imageSource2 = image2.getAttribute('data-src');
      image2.setAttribute('src', imageSource2);

      const image3 = document.getElementById('image3');
      const imageSource3 = image3.getAttribute('data-src');
      image3.setAttribute('src', imageSource3);
    }
  }
  else {
    const video1 = document.getElementById('video1');
    const videoSource1 = video1.getAttribute('data-src');
    video1.setAttribute('src', videoSource1);
    video1.setAttribute('poster', 'img/video3.jpg');
    
    const video2 = document.getElementById('video2');
    const videoSource2 = video2.getAttribute('data-src');
    video2.setAttribute('src', videoSource2);
    video2.setAttribute('poster', 'img/video4.jpg');

    const video3 = document.getElementById('video3');
    const videoSource3 = video3.getAttribute('data-src');
    video3.setAttribute('src', videoSource3);
    video3.setAttribute('poster', 'img/video5.jpg');
  }

  $('#answer-or-question-modal').modal('show');
  $('#add-tags-modal').modal('show');
  $('#welcome-new-platform').modal('show');

  $('#example').DataTable();

  // subir imagenes //
  const fileSelector = document.getElementById('inputGroupFile01');
  fileSelector.addEventListener('change', (event) => {

    var file = $('#inputGroupFile01')[0].files[0].name;
    $(this).next('label').text(file);

    document.getElementById('label-inputGroupFile01').val(file);

  });



  $('#reward').on('input', function () {

  });


  $('body').on('click', 'i.cross', function () {
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


  var classe = $(event.target).attr('class');

  if (classe == "tag-input" || classe.indexOf("tag-input") !== -1) {
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
  const fileList = event.target.files;
  console.log(fileList);
  $("#label-inputGroupFile01").val(fileList);

});





