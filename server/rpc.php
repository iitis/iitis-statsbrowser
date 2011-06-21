<?php

require "config.php";

/*** RPC functions ***/

/** List all files under given path
 * @param path     path under CFG_STATSDIR
 * @return         array of objects with:
 *                 name      holds entry name
 *                 path      holds path + name
 *                 isdir     true if entry is a directory
 *                 isstats   true if entry is a file with statistics data
 *                 columns   array of names of columns available in the file
 */
function rpc_path_ls($p)
{
	$path = str_replace("..", "", $p["path"]);

	if ($path[0] == '.')
		$path = substr($path, 1);
	if ($path[0] == '/')
		$path = substr($path, 1);

	$dir = CFG_STATSDIR . "/$path";
	$out = array();
	foreach (scandir($dir) as $name) {
		if ($name[0] == '.')
			continue;

		$info = array(
			"name"    => $name,
			"path"    => "$path/$name"
		);

		if (is_dir("$dir/$name")) {
			$info["isdir"] = true;
			$info["isstats"] = false;
		} else {
			$info["isdir"] = false;

			/* a file - read its first line */
			$fh = fopen("$dir/$name", "r");
			if ($fh) {
				$line = fgets($fh);
				fclose($fh);
			} else {
				$line = "";
			}

			/* check if first line is columns list */
			if (substr($line, 0, 6) == "#time ") {
				$info["isstats"] = true;
				$info["columns"] = explode(' ', substr($line, 1, -1));
			} else {
				/* ordinary file */
				$info["isstats"] = false;
			}
		}

		$out[] = $info;
	}

	return res($out);
}

/** Returns a zipped path
 * @param path        path to zip
 * @return binary data directly to the browser, skipping json encoding
 */
function rpc_path_zip($p)
{
	$path = str_replace("..", "", $p["path"]);

	if ($path[0] == '.')
		$path = substr($path, 1);
	if ($path[0] == '/')
		$path = substr($path, 1);

	/* create zip archive in temporary file */
	$zip = new ZipArchive();
	$filename = tempnam(sys_get_temp_dir(), "statsbrowser");

	if ($zip->open($filename, ZIPARCHIVE::CREATE) !== true)
		die("cant open file for zip: $filename");

	$dir = CFG_STATSDIR . "/$path";
	foreach (scandir($dir) as $name) {
		if ($name[0] == '.')
			continue;

		$zip->addFile("$dir/$name", "$path/$name");
	}

	$zip->close();

	/* send it to the browser */
	header('Content-Description: File Transfer');
	header('Content-Type: application/octet-stream');
	header('Content-Disposition: attachment; filename=' . str_replace("/", "_", $path) . '.zip');
	header('Content-Transfer-Encoding: binary');
	header('Expires: 0');
	header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
	header('Pragma: public');
	header('Content-Length: ' . filesize($filename));
	ob_clean();
	flush();
	readfile($filename);
	flush();
	unlink($filename);
	exit;
}

/** Returns file contents
 * @param path        path to file
 * @return contents directly to the browser, skipping json encoding
 */
function rpc_file_txt($p)
{
	$path = str_replace("..", "", $p["path"]);

	if ($path[0] == '.')
		$path = substr($path, 1);
	if ($path[0] == '/')
		$path = substr($path, 1);

	$file = CFG_STATSDIR . "/$path";
	if (is_dir($file))
		die("given path is a directory\n");

	/* send it to the browser */
	header('Content-Type: text/plain');
	header('Expires: 0');
	header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
	header('Pragma: public');
	header('Content-Length: ' . filesize($file));
	ob_clean();
	flush();
	readfile($file);
	exit;
}

/** Runs gnuplot for given script
 * @param  script    script to run
 */
function rpc_gnuplot($p)
{
	$sfile = tempnam(sys_get_temp_dir(), "statsbrowser-script");
	$sh = fopen($sfile, "w");
	fwrite($sh, $p["script"]);
	fclose($sh);

	/* open gnuplot */
	$desc = array(1 => array("pipe", "w"), 2 => array("pipe", "w"));
	$gp = proc_open("gnuplot $sfile", $desc, $pipes, CFG_STATSDIR, NULL, array("binary_pipes" => true));
	if (!is_resource($gp))
		die("proc_open(gnuplot) failed");

	/* read output and errors */
	$output = stream_get_contents($pipes[1]);
	fclose($pipes[1]);

	$errors = stream_get_contents($pipes[2]);
	fclose($pipes[2]);

	/* decide if it was successful */
	$rc = proc_close($gp);
	unlink($sfile);

	if ($rc == 0) { /* success */
		header('Content-Type: application'); /* avoid text/html */
		header('Expires: 0');
		header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
		header('Pragma: public');
		ob_clean();
		flush();
		echo $output;
		exit;
	} else {
		header('Content-Type: text/plain');
		header('Expires: 0');
		header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
		header('Pragma: public');
		ob_clean();
		flush();
		echo "gnuplot error (rc=$rc):\n";
		echo "=====================\n\n";
		echo $errors;
		exit;
	}
}

/*********************/

function err($code, $msg)
{
	return array("error" => array(
		"code"      => $code,
		"message"   => $msg
	));
}

function res($result)
{
	return array("result" => $result);
}

/*********************/

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	$req = json_decode($HTTP_RAW_POST_DATA, true);
	$method = $req["method"];
	$params = $req["params"];
} else {
	$method = $_GET["q"];
	$params = $_GET;
}

$handler = "rpc_$method";

if (function_exists($handler)) {
	$out = $handler($params);
} else if (isset($examples) && array_key_exists($method, $examples)) {
	$out = res($examples[$method]);
} else {
	$out = err(1, "Invalid method");
}

header("Content-Type: application/json-rpc");
echo json_encode($out) . "\n";
