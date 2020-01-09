$(document).ready(function(){
    // smooth scrolling to blog div
    $("#scroll").click(function (){
        $('html, body').animate({
            scrollTop: $("#home-wrapper").offset().top - $("#navbar").outerHeight(true) + 1
        }, 1500);
    });

});
    


