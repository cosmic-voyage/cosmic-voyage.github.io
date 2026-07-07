// One-off: pull the solar-system objects' data out of ../index.html into data.js
// so the 3D flight page shares the exact same facts, stats and NASA imagery.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

const stagesSrc = html.slice(
  html.indexOf("const STAGES = ["),
  html.indexOf("/* ============================================================\n   REAL IMAGERY")
);
const imagesSrc = html.slice(
  html.indexOf("const nasa = (id"),
  html.indexOf("/* ============================================================\n   STARFIELD")
);

const ctx = {};
vm.createContext(ctx);
vm.runInContext(stagesSrc + "\n" + imagesSrc + "\nthis.STAGES = STAGES; this.IMAGES = IMAGES;", ctx);

const WANT = ["The Sun", "Mercury", "Venus", "Earth", "The Moon", "Mars",
              "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const out = {};
for (const stage of ctx.STAGES) {
  for (const o of stage.objects) {
    if (!WANT.includes(o.name)) continue;
    out[o.name] = {
      kind: o.kind, tagline: o.tagline, stats: o.stats, facts: o.facts,
      img: ctx.IMAGES[o.name] || null,
    };
  }
}
const missing = WANT.filter(n => !out[n]);
if (missing.length) throw new Error("missing: " + missing);

fs.writeFileSync(path.join(__dirname, "data.js"),
  "// Generated from ../index.html by extract-data.js — regenerate after editing facts there.\n" +
  "window.FLY_DATA = " + JSON.stringify(out, null, 1) + ";\n");
console.log("data.js written:", WANT.length, "objects,",
  Object.values(out).reduce((n, o) => n + o.facts.length, 0), "facts");
