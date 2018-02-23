$(document).ready(function () {
  function submit() {
    const price = $("#price").text();
    if (price != parseInt(price, 10) || price < 1) {
      $("#error").removeClass('hidden');
      return;
    }
    $("#spinner").removeClass('hidden');
    $("#button-text").addClass('hidden');
    $.get('/price/' + price, function (data) {
      $("#date").text(data._id);
      $("#price-results").text(price);
      $("#results").removeClass('hidden');

      $("#error").addClass('hidden');
      $("#spinner").addClass('hidden');
      $("#button-text").removeClass('hidden');
    });
  }

  $("#submit").click(function () {
    submit();
  });

  $("#price").blur(function () {
    if ($("#price").text().length === 0)
      $("#price").text(1);
  });

  $("#price").keypress(function () {
    if (event.keyCode === 13) {
      if ($("#price").text().length === 0)
        $("#price").text(1);
      submit();
    }
    if (event.charCode < 48 || event.charCode > 57)
      return false;
    return true;
  });
});
