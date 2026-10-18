#!/usr/bin/env node
/**
 * build-test.js — Box & Whisker by TCViz
 *
 * Empaqueta una build de PRUEBA y restaura los fuentes al salir, pase lo que pase:
 *   node build-test.js          -> _test     (Pro forzado: isPro = true)
 *   node build-test.js --free   -> _testfree (licencia real: sin licencia = vista previa / gratuito)
 * Con el guid real, Power BI Desktop serviría la versión instalada desde AppSource y no la tuya.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const free = process.argv.includes("--free");
const PBIVIZ = path.join(__dirname, "pbiviz.json");
const VISUAL = path.join(__dirname, "src", "visual.ts");
const origP = fs.readFileSync(PBIVIZ, "utf8");
const origV = fs.readFileSync(VISUAL, "utf8");

let restored = false;
const restore = () => {
    if (restored) return;
    fs.writeFileSync(PBIVIZ, origP, "utf8");
    fs.writeFileSync(VISUAL, origV, "utf8");
    restored = true;
    console.log("  ↺ fuentes restaurados al estado de producción");
};
process.on("exit", restore);
process.on("SIGINT", () => { restore(); process.exit(1); });

const json = JSON.parse(origP);
if (json.visual.guid.endsWith("_test") || json.visual.guid.endsWith("_testfree")) {
    console.error("❌ El guid ya lleva sufijo de prueba: restaura pbiviz.json antes de seguir.");
    process.exit(1);
}
const suffix = free ? "_testfree" : "_test";
json.visual.guid += suffix;
json.visual.displayName += free ? " (test free)" : " (test)";
fs.writeFileSync(PBIVIZ, JSON.stringify(json, null, 2) + "\n", "utf8");

if (!free) {
    const FIND = "    private isPro = false;";
    if (origV.indexOf(FIND) === -1) { console.error("❌ No encuentro '" + FIND.trim() + "' en visual.ts: actualiza build-test.js."); process.exit(1); }
    fs.writeFileSync(VISUAL, origV.replace(FIND, "    private isPro = true; // PATCHED BY build-test.js"), "utf8");
}
try {
    execSync("npx pbiviz package", { stdio: "inherit", cwd: __dirname });
    console.log("  ✓ Test build created: dist/" + json.visual.guid + "." + json.visual.version + ".pbiviz");
} catch (e) {
    console.error("❌ La build ha fallado.");
    process.exitCode = 1;
} finally {
    restore();
}
