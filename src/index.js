const { resolve, dirname } = require("path");
const { existsSync, mkdirSync, createWriteStream, writeFileSync } = require("fs");
const { uniqueid, File, dbKeys } = require("./utils");

const { DataBase } = require("./api");

const fastDb = function(path = "databases"){
    const databasePath = resolve(path);
    if(!existsSync(databasePath)) mkdirSync(databasePath);

    const dbFile = resolve(databasePath, ".db");
    if(!existsSync(dbFile)) writeFileSync(dbFile, Buffer.from("", 'utf8'), {flag: 'wx'});

    const storagePath = resolve(databasePath, "storage");
    if(!existsSync(storagePath)) mkdirSync(storagePath);

    const db = new DataBase(dbFile);

    return {
        //Schema: (model, schema) => Schema(model, schema, path, readOnFind),
        database: db
        /*database: {
            get: (...args) => dbKeys.prototype.get.apply(db_keys, args)
        }*/
    };
}

module.exports = fastDb;