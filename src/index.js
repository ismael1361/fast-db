const { resolve, dirname } = require("path");
const { existsSync, mkdirSync, createWriteStream } = require("fs");
const { uniqueid, File, dbKeys } = require("./utils");

const fastDb = function(path = "databases"){
    const databasePath = resolve(path);
    if(!existsSync(dirname(databasePath))) mkdirSync(dirname(databasePath));

    const db_file = new File(databasePath);

    const db_keys = new dbKeys(db_file);

    //db_file.setLine(`Souza`).catch(console.log);

    //const context = await db_file.getLine(10, 2, 5, 100).catch(console.log);

    //console.log(context);

    /*const logger = createWriteStream(resolve(databasePath, ".db"), { flags: 'a'});
    const writeLine = (line) => logger.write(`${line}\n`);

    for(let i=0; i<1000; i++){
        writeLine(uniqueid(200));
    }*/

    return {
        //Schema: (model, schema) => Schema(model, schema, path, readOnFind),
        onInit: (fn) => {
            if(db_keys.readed && typeof fn === "function"){
                fn();
            }else{
                db_keys.onFinalled = function(){
                    if(db_keys.readed && typeof fn === "function"){
                        fn();
                    }
                }
            }
        },
        get: (...args) => dbKeys.prototype.get.apply(db_keys, args)
    };
}

module.exports = fastDb;