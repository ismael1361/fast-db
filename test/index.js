const last = process.memoryUsage().heapUsed / 1024 / 1024;

const path = require("path");

const { database } = require("../src")(path.resolve(__dirname, "db-local"));

const user = database.ref("/user/0");


console.log(`The script uses approximately ${Math.round(((process.memoryUsage().heapUsed / 1024 / 1024)  - last) * 100) / 100} MB`);