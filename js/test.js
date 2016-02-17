<script src="//cdn.bootcss.com/jquery/3.0.0-beta1/jquery.js"></script>
$.post("http://api.themoviedb.org/2.1/Movie.getImages/en/json/ed7e2e092ca896037ce13d2bf11a08f1/550&callback=?", 
   function(data){
    alert(data);
   }, 
"json");