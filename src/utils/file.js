const { resolve, dirname, join } = require("path");
const { existsSync, renameSync, unlinkSync, openSync, closeSync, readSync, writeSync } = require("fs");

const { encode, decode } = require("./shorter_string");

const { splitter } = require("./resources");

class nReadlines {
    constructor(file, options) {
        options = options || {};

        if (!options.readChunk) options.readChunk = 1024;

        if (!options.newLineCharacter) {
            options.newLineCharacter = 0x0a; //linux line ending
        } else {
            options.newLineCharacter = options.newLineCharacter.charCodeAt(0);
        }

        if (typeof file === 'number') {
            this.fd = file;
        } else {
            this.fd = openSync(file, 'r');
        }

        this.options = options;

        this.newLineCharacter = options.newLineCharacter;

        this.reset();
    }

    _searchInBuffer(buffer, hexNeedle) {
        let found = -1;

        for (let i = 0; i <= buffer.length; i++) {
            let b_byte = buffer[i];
            if (b_byte === hexNeedle) {
                found = i;
                break;
            }
        }

        return found;
    }

    reset() {
        this.eofReached = false;
        this.linesCache = [];
        this.fdPosition = 0;
    }

    close() {
        if(!this.fd){return;}
        closeSync(this.fd);
        this.fd = null;
    }

    _extractLines(buffer) {
        let line;
        const lines = [];
        let bufferPosition = 0;

        let lastNewLineBufferPosition = 0;
        while (true) {
            let bufferPositionValue = buffer[bufferPosition++];

            if (bufferPositionValue === this.newLineCharacter) {
                line = buffer.slice(lastNewLineBufferPosition, bufferPosition);
                lines.push(line);
                lastNewLineBufferPosition = bufferPosition;
            } else if (bufferPositionValue === undefined) {
                break;
            }
        }

        let leftovers = buffer.slice(lastNewLineBufferPosition, bufferPosition);
        if (leftovers.length) {
            lines.push(leftovers);
        }

        return lines;
    };

    _readChunk(lineLeftovers) {
        let totalBytesRead = 0;

        let bytesRead;
        const buffers = [];
        do {
            const readBuffer = Buffer.alloc(this.options.readChunk);

            bytesRead = readSync(this.fd, readBuffer, 0, this.options.readChunk, this.fdPosition);
            totalBytesRead = totalBytesRead + bytesRead;

            this.fdPosition = this.fdPosition + bytesRead;

            buffers.push(readBuffer);
        } while (bytesRead && this._searchInBuffer(buffers[buffers.length-1], this.options.newLineCharacter) === -1);

        let bufferData = Buffer.concat(buffers);

        if (bytesRead < this.options.readChunk) {
            this.eofReached = true;
            bufferData = bufferData.slice(0, totalBytesRead);
        }

        if (totalBytesRead) {
            this.linesCache = this._extractLines(bufferData);

            if (lineLeftovers) {
                this.linesCache[0] = Buffer.concat([lineLeftovers, this.linesCache[0]]);
            }
        }

        return totalBytesRead;
    }

    next() {
        if (!this.fd) return false;

        let line = false;

        if (this.eofReached && this.linesCache.length === 0) {
            return line;
        }

        let bytesRead;

        if (!this.linesCache.length) {
            bytesRead = this._readChunk();
        }

        if (this.linesCache.length) {
            line = this.linesCache.shift();

            const lastLineCharacter = line[line.length-1];

            if (lastLineCharacter !== this.newLineCharacter) {
                bytesRead = this._readChunk(line);

                if (bytesRead) {
                    line = this.linesCache.shift();
                }
            }
        }

        if (this.eofReached && this.linesCache.length === 0) {
            this.close();
        }

        if (line && line[line.length-1] === this.newLineCharacter) {
            line = line.slice(0, line.length-1);
        }

        return line;
    }
}

const File = function(path){
    path = resolve(path);

    if(!path || !existsSync(path)){throw "File not found!";}

    this.path = path;
    this.breakLine = 128;
}

File.prototype.read = function(onRead, onEnd){
    if(typeof onRead !== "function"){ return; }

    const broadbandLines = new nReadlines(this.path, { newLineCharacter: " " });

    let l, lineNumber = 0;

    while(l = broadbandLines.next()){
        const onStrop = onRead(decode(l.toString().replace(/\n/gi, "")) || null, lineNumber);

        if(typeof onStrop === "boolean" && onStrop){
            break;
        }

        lineNumber++;
    }

    if(typeof onEnd === "function"){
        onEnd(lineNumber+1);
    }

    broadbandLines.close();
}

File.prototype.getLine = function(...lines){
    return new Promise((resolve, reject)=>{
        try{
            lines = lines.filter(l => typeof l === "number");
            if(lines.length <= 0){ throw "Something went wrong when trying to read the file"; }

            const broadbandLines = new nReadlines(this.path, { newLineCharacter: " " });

            let l, lineNumber = 0, result = new Array(lines.length).fill().map(() => null);

            while(l = broadbandLines.next()){
                if(lines.includes(lineNumber)){
                    result[lines.indexOf(lineNumber)] = decode(l.toString().replace(/\n/gi, "")) || null;
                }

                if(result.every(l => typeof l === "string")){
                    break;
                }

                lineNumber++;
            }

            resolve(result.length > 1 ? result : result[0]);
            broadbandLines.close();
        }catch(e){
            reject(e);
        }
    });
}

File.prototype.setLine = function(context, line){
    return new Promise((resolve, reject)=>{
        try{
            if(["string", "number", "boolean"].includes(typeof context) !== true){ throw "Something went wrong when trying to write the file"; }

            context = encode(context.toString());

            const backup = join(dirname(this.path), ".backup");

            renameSync(this.path, backup);

            const broadbandLines = new nReadlines(backup, { newLineCharacter: " " });

            const newFile = openSync(this.path, 'w');

            let l, lineNumber = 0, pos = 0;

            const getContextRender = (context, offset)=>{
                let result = [];

                result.push(context.substring(0, offset));

                result = result.concat(splitter(context.substring(offset, context.length), this.breakLine));

                return result.join("\n");
            }

            while(l = broadbandLines.next()){
                const str = getContextRender(`${lineNumber === line ? context : l.toString().replace(/\n/gi, "")} `, this.breakLine - (pos%(this.breakLine+1)));
                const newLine = Buffer.from(str, 'utf8');

                writeSync(newFile, newLine, 0, newLine.length, pos);

                lineNumber++;
                pos += newLine.length;
            }

            line = !line || typeof line !== "number" ? lineNumber : line;

            if(lineNumber <= line){
                for(let i=lineNumber; i<=line; i++){
                    const str = getContextRender(`${i === line ? context : ""} `, this.breakLine - (pos%(this.breakLine+1)));
                    const newLine = Buffer.from(str, 'utf8');

                    writeSync(newFile, newLine, 0, newLine.length, pos);

                    lineNumber++;
                    pos += newLine.length;
                }
            }

            closeSync(newFile);

            unlinkSync(backup);

            resolve(context);
        }catch(e){
            reject(e);
        }
    });
}

module.exports = File;