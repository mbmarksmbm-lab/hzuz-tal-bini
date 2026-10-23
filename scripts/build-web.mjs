// Builds www/ for the app from the calculator page (../hnejja.html or src/calculator.html).
import fs from "fs";import path from "path";
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const src=fs.readFileSync(path.join(root,"src/calculator.html"),"utf8");
const www=path.join(root,"www"),lib=path.join(www,"lib");
fs.rmSync(www,{recursive:true,force:true});fs.mkdirSync(lib,{recursive:true});
const libs={"jspdf.umd.min.js":"jspdf/dist/jspdf.umd.min.js","jszip.min.js":"jszip/dist/jszip.min.js","polygon-clipping.umd.min.js":"polygon-clipping/dist/polygon-clipping.umd.min.js"};
for(const [n,p] of Object.entries(libs))fs.copyFileSync(path.join(root,"node_modules",p),path.join(lib,n));
fs.copyFileSync(path.join(root,"src/app.js"),path.join(www,"app.js"));
let h=src
 .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>','<script src="lib/jspdf.umd.min.js"></script>')
 .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>','<script src="lib/jszip.min.js"></script>')
 .replace('<script src="https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/dist/polygon-clipping.umd.min.js"></script>','<script src="lib/polygon-clipping.umd.min.js"></script>')
 .replace("<script>\nwindow.LAST=null;",'<script src="app.js"></script>\n<script>\nwindow.LAST=null;')
 .replace("<title>Ħnejjiet u Taraġ</title>","<title>Ħżuż tal-Bini</title>")
 .split("<h1>Ħnejjiet u Taraġ</h1>").join("<h1>Ħżuż tal-Bini</h1>");
for(const must of ["lib/jspdf","lib/jszip","lib/polygon","app.js"])if(!h.includes(must))throw new Error("build: missing "+must);
const head='<!doctype html><html lang="mt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
fs.writeFileSync(path.join(www,"index.html"),head+h+"</body></html>");
console.log("www built");
