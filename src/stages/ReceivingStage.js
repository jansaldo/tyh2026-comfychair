const BiddingStage = require("./BiddingStage");
const SessionStage = require("./SessionStage");

class ReceivingStage extends SessionStage{
    constructor(){
        super("Receiving");
    }
    canSubmit(paper){
        return paper.isValid();
    }
    submit(session, paper){
        if (!paper.isValid()) {
            throw new Error("Cannot submit invalid paper");
        }

        session._addPaper(paper);
    }
    updatePaper(session, paper, author, candidatePaper){
        if (!session._containsPaper(paper)) {
            throw new Error("Paper was not submitted to this session");
        }

        if (!paper.hasAuthor(author)) {
            throw new Error("Only an author can update this paper");
        }

        paper.updateFrom(candidatePaper);
    }
    closeSubmissions(session){
        session._transitionTo(new BiddingStage());
    }
}

module.exports = ReceivingStage;
