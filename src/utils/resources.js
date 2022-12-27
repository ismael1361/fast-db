const chunkString = (str, length)=>{
  return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

const uniqueid = (length, separator) =>{
    length = typeof length === "number" ? length : 30;
    separator = typeof separator === "number" ? separator : length;

	let idstr = String.fromCharCode(Math.floor((Math.random()*25)+65));

	do{
		let ascicode = Math.floor((Math.random()*42)+48);

		if(ascicode<58 || ascicode>64){
			idstr+=String.fromCharCode(ascicode);
		}

	}while(idstr.length<length);

	return chunkString(idstr, separator).join("-");
}

const splitter = (str, l)=>{
    let strs = [], pos = 0;
    while(str.length > pos){
        strs.push(str.substring(pos, pos+l));
        pos = pos+l;
    }
    return strs;
}

module.exports = {
    uniqueid,
    splitter
};