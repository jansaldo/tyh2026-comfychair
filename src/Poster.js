const Paper = require("./Paper");

class Poster extends Paper{
    constructor(title, authors, correspondingAuthor, attachmentUrl, sourcesUrl){
        super(title, authors, correspondingAuthor);
        this._attachmentUrl = attachmentUrl;
        this._sourcesUrl = sourcesUrl;
    }
    attachmentUrl(){
        return this._attachmentUrl;
    }
    sourcesUrl(){
        return this._sourcesUrl;
    }
    copySpecificEditableDataFrom(candidatePaper){
        this._attachmentUrl = candidatePaper.attachmentUrl();
        this._sourcesUrl = candidatePaper.sourcesUrl();
    }
}

module.exports = Poster;
