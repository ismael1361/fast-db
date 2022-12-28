const { resolve, dirname } = require("path");
const { existsSync, mkdirSync, createWriteStream, writeFileSync } = require("fs");
const { uniqueid, File, dbKeys } = require("../utils");

class DataBase{
    constructor(dbFile){
        this.db_file = new File(dbFile);
        this.db_keys = new dbKeys(this.db_file);

        //db_file.setLine(`Ismael`, 1).catch(console.log);

        //const context = await db_file.getLine(10, 2, 5, 100).catch(console.log);

        //console.log(context);

        this.onInited = (fn) => {
            if(this.db_keys.readed && typeof fn === "function"){
                fn();
            }else{
                this.db_keys.onFinalled = function(){
                    if(this.db_keys.readed && typeof fn === "function"){
                        fn();
                    }
                }
            }
        }
    }

    ref(ref_path){

    }
}

module.exports = DataBase;