

$(function () {
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

  /// editor de texto froala ////
  new FroalaEditor('textarea', {
    // Set custom buttons with separator between them.
    toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'html'],
    toolbarButtonsXS: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'html'],
    quickInsertButtons: [],
    charCounterMax: 10000
  });

  $(".button-best-answer").on("click", function (e) {

    var answer = confirm("Are you sure this is the best answer? this user will be the only one who will receive the reward of the question");
    if (answer) {
      return true;
    } else {
      e.preventDefault();
    }
  });

$('.body-question-description').each(function(e) {


    var $pTag = $(this).find('p');
    console.log($pTag.text());

    console.log($pTag.text().length);
    if($pTag.text().length > 200){
        var shortText = $pTag.text();
        shortText = shortText.substring(0, 200);
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

  $("#alertbutton").click(function (e) {
    console.log(e);
    $(".alert").fadeOut();
  });
});


$('body').on('click', 'i.cross', function () {
  console.log("entro");
  var removedItem = $(this).parent().contents(':not(i)').text();
  $(this).parent().remove();
  tags = $.grep(tags, function (value) {
    return value != removedItem;
  });
});

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

var tags = [];
$(document).ready(function () {

  $('#example').DataTable();
  
  const fileSelector = document.getElementById('inputGroupFile01');
  fileSelector.addEventListener('change', (event) => {

    var file = $('#inputGroupFile01')[0].files[0].name;
    console.log(file);
    $(this).next('label').text(file);

    document.getElementById('label-inputGroupFile01').val(file);

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



  /// editor de texto froala ////
  new FroalaEditor('textarea', {
    // Set custom buttons with separator between them.
    toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'html'],
    toolbarButtonsXS: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'html'],
    quickInsertButtons: [],
    charCounterMax: 10000
  });



});

$(document).on("keydown", ":input:not(textbox)", function (event) {
  return event.key != "Enter";
});

let elmButton = document.querySelector("#addcustomerbutton");

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

function addRatingAnswerAjax(p_idanswer, p_rating) {

  document.getElementById('1_' + p_idanswer).disabled = true;
  document.getElementById('2_' + p_idanswer).disabled = true;
  document.getElementById('3_' + p_idanswer).disabled = true;
  document.getElementById('4_' + p_idanswer).disabled = true;
  document.getElementById('5_' + p_idanswer).disabled = true;


  $.ajax({
    url: '/questions/add_rating/' + p_idanswer + '&' + p_rating,
    success: function (json) {
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
/// editor de texto froala ////
new FroalaEditor('textarea', {
  // Set custom buttons with separator between them.
  toolbarButtons: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'html'],
  toolbarButtonsXS: ['undo', 'redo', '|', 'bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'outdent', 'indent', 'clearFormatting', 'html'],
  quickInsertButtons: [],
  charCounterMax: 10000
});
//new FroalaEditor('textarea#new_answer');


