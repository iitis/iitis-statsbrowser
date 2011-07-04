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
			plugins: [ "json_data", "checkbox", "ui", "themes", "contextmenu", "crrm" ],
			core: {
				animation: 0
			},
			json_data: {
				data: {
					data: "/",
					attr: { id: "root_node" },
					metadata: { path: "/" }
				}
			},
			ui: {
				initially_select: "root_node"
			},
			contextmenu: {
				items: T.ctxmenu
			}
		})
		.bind("select_node.jstree", T.node_selected)
		.bind("open_node.jstree", T.node_load)
		.bind("rename.jstree", T.rename);
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
				state: (v.isdir || v.isstats) ? "closed" : undefined,
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
},

ctxmenu: function($node)
{
	/* no menu for columns */
	if ($node.data("iscolumn"))
		return undefined;

	/* common options */
	var out = {
		title:  { label: $node.data("name"), _disabled: true, separator_after: true },
		rename: { label: "Rename", action: function($n) { this.rename($n); } },
		delete: { label: "Delete", action: T.delete, separator_after: true }
	};

	if (!$node.data("isdir")) {
		out.txt = { label: "Get as TXT", action: T.txt };
	} else if ($node.data("isdir")) {
		out.zip = { label: "Get as ZIP", action: T.zip };
	}

	return out;
},

txt: function($node)
{
	window.open("rpc.php?" + $.param({
		q:    "file_txt",
		path: $node.data("path")
	}));
},

zip: function($node)
{
	window.open("rpc.php?" + $.param({
		q:    "path_zip",
		path: $node.data("path")
	}));
},

delete: function($node)
{
	if (!confirm("Are you sure?"))
		return;

	$.rpc("remove", { path: $node.data("path") }, function (r)
	{
		if (r.status) {
			$("#tree").jstree("delete_node", $node);
		} else {
			alert("Deletion failed");
		}
	});
},

rename: function(ev, data)
{
	if (data.rslt.old_name == data.rslt.new_name)
		return;

	var $node = data.rslt.obj;
	var tree = this;

	var path    = $node.data("path");
	var newpath = path.replace(/\/[^\/]+$/, "/" + data.rslt.new_name);
	$.rpc("rename", { path: path, newpath: newpath }, function(r)
	{
		if (r.status) {
			$node.data("name", data.rslt.new_name);
			$node.data("path", newpath);

			$("#tree").jstree("uncheck_node", $node);

			/* delete children */
			$node.find("li").each(function(k, v)
			{
				$("#tree").jstree("delete_node", v);
			});

			/* reload */
			$node.data("loaded", false);
			T.node_load(ev, data, false);
		} else {
			alert("Rename failed");
		}
	});
}
};
