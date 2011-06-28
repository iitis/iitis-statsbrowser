/*
 * iitis-statsbrowser
 * Paweł Foremski <pjf@iitis.pl> 2011
 * IITiS PAN Gliwice
 */

var P = {
init: function()
{
},

plot: function()
{
	$("#plot").attr({
		src: "rpc.php?" + $.param({q: "gnuplot", script: S.get()})
	});
},

width:  function() { return $("#plot").width(); },
height: function() { return $("#plot").height(); }
};
