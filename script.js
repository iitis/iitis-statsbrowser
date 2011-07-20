/*
 * iitis-statsbrowser
 * Paweł Foremski <pjf@iitis.pl> 2011
 * IITiS PAN Gliwice
 */

var S = {
init: function()
{
	$("#but_update")
		.button({icons: { primary: "ui-icon-refresh" }})
		.click(S.update);

	$("#but_plot")
		.button({icons: { primary: "ui-icon-image" }})
		.click(P.plot);
},

/* get selected tree elements and generate new script */
update: function()
{
	var text;
	var count = 0;
	var title;

	text  = "set grid\n";

	T.get_selected().each(function()
	{
		var d = $(this).data();

		if (!d.iscolumn)
			return;

		if (count++)
			text += ",\\\n     ";
		else
			text += "plot ";

		title = d.file
			.replace(/^[^\/]+\//, "")
			.replace(/.txt$/, "");

		text += "\"" + d.file + "\" using 1:" + d.index
		      + " title '" + title + " " + d.title + "'";
	});

	$("#script").val(text);
},

get_canvas: function()
{
	return sprintf(
		"set terminal canvas size %u,%u " +
		"standalone jsdir 'gnuplot'\n",
		P.width() - 20, P.height() - 20);
/*		"set terminal canvas size %u,%u " +
		"standalone mousing jsdir 'gnuplot'\n",
		P.width() - 200, P.height() - 30);*/
},

/* get full script contents */
get: function()
{
	return S.get_canvas() + $("#script").val();
}
};
