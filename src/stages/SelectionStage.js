const SessionStage = require("./SessionStage");

class SelectionStage extends SessionStage{
    constructor(){
        super("Selection");
    }
    selectAcceptedPapers(session){
        const acceptedPapers = session.acceptancePolicy().select(session.papers());
        session._replaceAcceptedPapers(acceptedPapers);
        return acceptedPapers;
    }
    acceptedPapers(session){
        return session._acceptedPapers;
    }
}

module.exports = SelectionStage;
