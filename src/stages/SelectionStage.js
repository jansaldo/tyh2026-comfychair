const FixedAcceptanceSelector = require("../FixedAcceptanceSelector");
const SessionStage = require("./SessionStage");

class SelectionStage extends SessionStage{
    constructor(){
        super("Selection");
    }
    selectAcceptedPapers(session){
        const selector = new FixedAcceptanceSelector();
        const acceptedPapers = selector.select(
            session.papers(),
            session.acceptancePercentage()
        );
        session._replaceAcceptedPapers(acceptedPapers);
        return acceptedPapers;
    }
    acceptedPapers(session){
        return session._acceptedPapers;
    }
}

module.exports = SelectionStage;
