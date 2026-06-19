const fs = require("fs");
const path = require("path");

const output = path.join(__dirname, "dist");
const files = ["index.html", "styles.css", "app.js", "cloud.js"];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
}
fs.mkdirSync(path.join(output, "assets"), { recursive: true });
for (const asset of ["clube-da-regua-icon-192.png", "favicon.png"]) {
  fs.copyFileSync(path.join(__dirname, "assets", asset), path.join(output, "assets", asset));
}

const config = `window.BARBERFLOW_CONFIG = ${JSON.stringify({
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "",
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ""
})};`;
fs.writeFileSync(path.join(output, "config.js"), config);

console.log(`Build estático concluído: ${files.length + 1} arquivos em dist`);
