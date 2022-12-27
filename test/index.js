const last = process.memoryUsage().heapUsed / 1024 / 1024;

const path = require("path");

const db = require("../src")(path.resolve(__dirname, "db-local.db"));

db.onInit(()=>{
    console.log("Ok");
    db.get("user[0]").then(console.log);
});

console.log(`The script uses approximately ${Math.round(((process.memoryUsage().heapUsed / 1024 / 1024)  - last) * 100) / 100} MB`);