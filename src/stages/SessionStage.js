class SessionStage{
    constructor(name){
        this._name = name;
    }
    name(){
        return this._name;
    }
    canSubmit(paper){
        return false;
    }
    reject(operation){
        throw new Error("Cannot " + operation + " during " + this.name() + " stage");
    }
    submit(session, paper){
        this.reject("submit papers");
    }
    updatePaper(session, paper, author, candidatePaper){
        this.reject("update papers");
    }
    closeSubmissions(session){
        this.reject("close submissions");
    }
    enterBid(session, paper, reviewer, interest){
        this.reject("enter bids");
    }
    closeBidding(session){
        this.reject("close bidding");
    }
    submitReview(session, paper, reviewer, text, score){
        this.reject("submit reviews");
    }
    closeReviewing(session){
        this.reject("close reviewing");
    }
    selectAcceptedPapers(session){
        this.reject("select accepted papers");
    }
    acceptedPapers(session){
        this.reject("query accepted papers");
    }
}

module.exports = SessionStage;
