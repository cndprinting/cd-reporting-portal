#!/usr/bin/env node
/**
 * Install (or uninstall) the AccuZIP watcher as a Windows service using nssm.
 *
 * Prereqs:
 *   - Download nssm.exe from https://nssm.cc/download and put it on PATH,
 *     or in this folder.
 *   - Run this script from an elevated (Administrator) cmd prompt.
 *
 * Usage:
 *   node install-service.js            ← install
 *   node install-service.js uninstall  ← remove
 */

"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const SERVICE_NAME = "CDAccuZipWatcher";
const WATCHER_JS = path.resolve(__dirname, "watcher.js");
const NODE_EXE = process.execPath;

function run(...args) {
  console.log("nssm", args.join(" "));
  const r = spawnSync("nssm", args, { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`nssm exited with status ${r.status}`);
    process.exit(r.status || 1);
  }
}

const action = process.argv[2];
if (action === "uninstall") {
  run("stop", SERVICE_NAME);
  run("remove", SERVICE_NAME, "confirm");
  console.log("Service removed.");
  process.exit(0);
}

run("install", SERVICE_NAME, NODE_EXE, WATCHER_JS);
run("set", SERVICE_NAME, "AppDirectory", __dirname);
run("set", SERVICE_NAME, "Start", "SERVICE_AUTO_START");
run("set", SERVICE_NAME, "AppStdout", path.join(__dirname, "watcher.out.log"));
run("set", SERVICE_NAME, "AppStderr", path.join(__dirname, "watcher.err.log"));
run("set", SERVICE_NAME, "AppRotateFiles", "1");
run("set", SERVICE_NAME, "AppRotateOnline", "1");
run("set", SERVICE_NAME, "AppRotateBytes", "10485760"); // 10 MB
run("start", SERVICE_NAME);
console.log(`\nService '${SERVICE_NAME}' installed and started.`);
console.log(`Logs: ${path.join(__dirname, "watcher.out.log")}`);
