const fs = require("fs");
const path = require("path");

const output = path.join(__dirname, "dist");
const files = ["index.html", "styles.css", "app.js"];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
}

console.log(`Build estático concluído: ${files.length} arquivos em dist`);
