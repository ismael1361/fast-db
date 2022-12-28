const DbKeys = function(db_file, onFinalled){
    this.db_file = db_file;
    this.keys = [];

    this.readed = false;
    this.readFailed = false;
    this.readError = null;

    this.onFinalled = typeof onFinalled === "function" ? onFinalled : function(){};

    this.__start().catch((error)=>{
        this.readFailed = true;
        this.readError = error;
    }).finally(()=>{
        this.readed = true;
        if(typeof this.onFinalled === "function"){
            this.onFinalled(this.readError, this.keys);
        }
    });
}

DbKeys.prototype.__start = function(){
    return new Promise((resolve, reject)=>{
        try{
            this.db_file.read((context, line)=>{
                if(line%2 == 0){ this.keys.push([context, line+1]); }
            }, async ()=>{
                resolve();
            });
        }catch(e){
            reject(typeof e !== "string" ? e.message : e);
        }
    });
}

DbKeys.prototype.__findPath = function(path, paths){
    path = path.replace(/^(\/+)/gi, "").replace(/(\/+)$/gi, "");
    return (Array.isArray(paths) ? paths : this.keys).filter(([p, l]) => {
        const np = p.indexOf(path) === 0 ? p.substring(path.length, p.length) : p;
        return p.indexOf(path) === 0 && (/^(\[\d+\])?\//gi).test(np);
    });
}

DbKeys.prototype.__parsePath = async function(path, paths, context){
    path = path.replace(/^(\/+)/gi, "").replace(/(\/+)$/gi, "");

    const findIndex = this.keys.findIndex(([p, l]) => p === path);

    if(findIndex >= 0){
        return await this.db_file.getLine(this.keys[findIndex][1]);
    }

    let result = {};

    paths = this.__findPath(path, paths).map(([p, l]) => {
        return [p.substring(path.length, p.length).replace(/^(\/+)/gi, ""), l];
    });

    if(paths.every(([p, l]) => (/^(\[\d+\])\//gi).test(p))){
        result = [];
    }

    context = context ? context : (await this.db_file.getLine(...paths.map(([p, l]) => l))).reduce((obj, value, i)=>{
        const [p, l] = paths[i];
        obj[l] = value;
        return obj;
    }, {});

    for(let i=0; i<paths.length; i++){
        const [p, l] = paths[i];

        let keys = p.split("/");
        let key = keys.shift();
        let index = ((/^(\[\d+\])$/gi).test(key) ? parseInt(key.replace(/[\D]/gi, "")) : (key).replace(/(\[\d+\])$/gi, ""));

        if(keys.length < 1){
            result[index] = context[l];
        }else if((/^([\S\s]+)(\[\d+\])$/g).test(key)){
            if(!result[index]){
                let is_array = this.__findPath(index, paths).map(([p, l]) => {
                    return [p.substring(index.length, p.length).replace(/^(\/+)/gi, ""), l];
                }).every(([p, l]) => (/^(\[\d+\])\//gi).test(p));

                result[index] = is_array ? [] : {};
            }

            let i = parseInt(key.match(/\[(\d+)\]$/i)[1]);

            if(!result[index][i]){
                result[index][i] = await this.__parsePath(key, paths, context);
            }
        }else if(!result[index]){
            result[index] = await this.__parsePath(key, paths, context);
        }
    }

    return result;
}

DbKeys.prototype.get = function(path){
    return new Promise(async (resolve, reject)=>{
        try{
            path = path.replace(/^(\/+)/gi, "").replace(/(\/+)$/gi, "");
            path = ["DB", path].join("/");

            return resolve(await this.__parsePath(path));

            let result = {};

            keys = this.__findPath(path).map(([p, l]) => {
                p = p.replace(path, "").split("/");
                //p.splice(0, 1);
                return [p.join("/"), l];
            });

            if(keys.length <= 0){
                resolve(result);
            }

            const context = await this.db_file.getLine(...keys.map(([p, l]) => l));

            keys = keys.map(([p, l], i) => [p, context[i]]);

            keys.forEach(([p, c]) => {
                p = p.split("/");
                let k = (/\[(\s+)?(\d+)(\s+)?\]$/gi).test(p[0]) ? parseInt(p[0].match(/\[(\s+)?(\d+)(\s+)?\]$/i)[2]) : p[0];
                let temp = [p.length <= 1 ? c : (result[k] || {})];
                p.splice(0, 1);

                p.forEach((k, i)=>{
                    temp.push(temp[i][k] = i >= p.length-1 ? c : (temp[i][k] || {}));
                });

                console.log(temp[0]);

                if(String(k).trim() === ""){
                    result = typeof temp[0] === "object" ? Object.assign(result || {}, temp[0]) : temp[0];
                }else{
                    result[k] = typeof temp[0] === "object" ? Object.assign(result[k] || {}, temp[0]) : temp[0];
                }
            });

            resolve(result);
        }catch(e){
            console.log(e);
            reject("Content not found!");
        }
    });
}

module.exports = DbKeys;