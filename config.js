const fs = require("node:fs");

const dotEnvContent = fs.readFileSync(".env", { encoding: "utf8" });

dotEnvContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^'(.*)'$/, '$1')
    process.env[key.trim()] = value;
  }
});