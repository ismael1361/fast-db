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
            }, ()=>{
                resolve();
            });
        }catch(e){
            reject(typeof e !== "string" ? e.message : e);
        }
    });
}

DbKeys.prototype.__findPath = function(path){
    path = path.replace(/^(\/+)/gi, "").replace(/(\/+)$/gi, "");
    return this.keys.filter(([p, l]) => p.indexOf(path) === 0);
}

DbKeys.prototype.get = function(path){
    return new Promise(async (resolve, reject)=>{
        try{
            path = path.replace(/^(\/+)/gi, "").replace(/(\/+)$/gi, "");

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
            reject(typeof e !== "string" ? e.message : e);
        }
    });
}

module.exports = DbKeys;