(function(){
  function applySarfrutLogo(){
    var logo = window.SARFRUT_LOGO_DATA_URL;
    if(!logo) return;
    document.querySelectorAll('img[data-sarfrut-logo]').forEach(function(img){
      img.src = logo;
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applySarfrutLogo);
  } else {
    applySarfrutLogo();
  }
})();
