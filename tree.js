/*
 * iitis-statsbrowser
 * Paweł Foremski <pjf@iitis.pl> 2011
 * IITiS PAN Gliwice
 */

var T = {
init: function()
{
	/* create initial tree with statistics dirs and files */
	$("#tree")
		.jstree({
			plugins: [ "json_data", "checkbox", "ui", "themes" ],
			core: { animation: 0 },
			json_data: {
				data: {
					data: "/",
					attr: { id: "root_node" },
					metadata: { path: "/" }
				}
			},
			ui: { initially_select: "root_node" }
		})
		.bind("select_node.jstree", T.node_selected)
		.bind("open_node.jstree", T.node_load);
},

node_selected: function(ev, data)
{
	var $node = data.rslt.obj;

	if ($node.data("iscolumn") == true) {
		if ($("#tree").jstree("is_checked", $node))
			$("#tree").jstree("uncheck_node", $node);
		else
			$("#tree").jstree("check_node", $node);
	} else {
		T.node_load(ev, data, true);
	}
},

node_load: function(ev, data, toggle)
{
	var $node = data.rslt.obj;
	var method;

	/* skip columns */
	if ($node.data("iscolumn") == true)
		return;

	/* exit ASAP if already loaded */
	if ($node.data("loaded") == true) {
		if (toggle)
			$("#tree").jstree("toggle_node", data.rslt.obj);
		return;
	}

	$.rpc("path_ls", { path: $node.data("path") }, function(d) {
		/* mark node as loaded */
		if ($node.data("loaded") == true)
			return;
		else
			$node.data("loaded", true);

		/* append children */
		$.each(d, function(k, v)
		{
			$("#tree").jstree("create_node", $node, "last", {
				data: {
					title: v.name,
					attr: { class: v.isstats ? "isstats" : "" }
				},
				state: "closed",
				metadata: v
			}, v.isstats ? function($obj)
			{
				$.each(v.columns, function(k2, v2)
				{
					if (v2 == "time")
						return;

					$("#tree").jstree("create_node", $obj, "last", {
						data: v2,
						metadata: {
							iscolumn: true,
							file: v.path,
							index: k2 + 1,
							title: v2
						}
					});
				});
			} : undefined);
		});

		if (toggle)
			$("#tree").jstree("toggle_node", data.rslt.obj);
	});
},

get_selected: function()
{
	return $("#tree .jstree-checked.jstree-leaf");
}
};
