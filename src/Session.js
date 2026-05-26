const {Bid, Interests} = require("./Bid");
const FixedAcceptanceSelector = require("./FixedAcceptanceSelector");
const ReviewerAssigner = require("./ReviewerAssigner");

class Session{
    constructor(){
        this._name = "";
        this._programCommittee=[];
        this._papers=[];
        this._bids=[];
        this._assignments=[];
        this._acceptedPapers=[];
        this._stage="Receiving";
        this._acceptancePercentage=0;
    }
    name(){
        return this._name;
    };
    programCommittee(){
        return this._programCommittee;
    };
    reviewers(){
        return this._programCommittee;
    };
    addReviewer(user){
        this._programCommittee.push(user);
    }
    canSubmit(paper){
        if (this.stage() == "Receiving" )
            return paper.isValid();
        else 
            return false;
    }
    submit(paper){
        if (!this.canSubmit(paper)) throw new Error("Cannot submit invalid paper");
        
        if (this.stage() == "Receiving" )
            this._papers.push(paper);
        else
            throw new Error("Cannot submit papers at this stage");
    }
    papers(){
        return this._papers;
    }
    bids(){
        return this._bids;
    }
    stage(){
        return this._stage;
    }
    setStage(stage){
        this._stage = stage;
    }
    closeSubmissions(){
        this.setStage("Bidding");
    }
    assertStage(expectedStage){
        if (this.stage() !== expectedStage) {
            throw new Error("Session must be at stage " + expectedStage);
        }
    }
    enterBid(paper, reviewer, interest){
        if (this.stage() == "Bidding" )
            if(this.bidExistsFor(paper, reviewer)){
                let existing =  this.bidFor(paper, reviewer);
                existing.setInterest(interest);
            }
            else{
                let bid = new Bid(paper, reviewer, interest);
                this._bids.push(bid);
            }
        else
            throw new Error("Cannot enter bids from the current stage.");
    }
    closeBidding(){
        this.assertStage("Bidding");

        const assigner = new ReviewerAssigner();
        const assignments = assigner.assign(this._papers, this._programCommittee, this._bids);

        this._assignments = assignments;
        this._stage = "Reviewing";
    }
    assignedReviewersFor(paper){
        const assignedReviewers = [];

        for (const assignment of this._assignments) {
            if (assignment.paper() === paper) {
                assignedReviewers.push(assignment.reviewer());
            }
        }

        return assignedReviewers;
    }
    isReviewerAssignedTo(paper, reviewer){
        for (const assignment of this._assignments) {
            if (assignment.matches(paper, reviewer)) {
                return true;
            }
        }

        return false;
    }
    submitReview(paper, reviewer, text, score){
        this.assertStage("Reviewing");

        if (!this.isReviewerAssignedTo(paper, reviewer)) {
            throw new Error("Reviewer is not assigned to this paper");
        }

        paper.addReview(reviewer, text, score);
    }
    closeReviewing(){
        this.assertStage("Reviewing");

        if (!this.allReviewsSubmitted()) {
            throw new Error("Cannot close reviewing before all assigned reviews are submitted");
        }

        this._stage = "Selection";
    }
    allReviewsSubmitted(){
        for (const paper of this._papers) {
            if (paper.reviewsCount() !== 3) {
                return false;
            }
        }

        return true;
    }
    setAcceptancePercentage(percentage){
        if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
            throw new Error("Acceptance percentage must be between 0 and 100");
        }

        this._acceptancePercentage = percentage;
    }
    selectAcceptedPapers(){
        this.assertStage("Selection");

        const selector = new FixedAcceptanceSelector();
        this._acceptedPapers = selector.select(this._papers, this._acceptancePercentage);

        return this._acceptedPapers;
    }
    acceptedPapers(){
        return this._acceptedPapers;
    }
    bidExistsFor(paper, reviewer){
        return typeof(this.bidFor(paper, reviewer)) != "undefined";
    }
    bidFor(paper, reviewer){
        for (const existingBid of this._bids) {
            if (this.isBidFor(existingBid, paper, reviewer)) {
                return existingBid;
            }
        }
    }
    isBidFor(existingBid, paper, reviewer){
        return existingBid.paper() === paper && existingBid.reviewer() === reviewer;
    }
    interestFor(paper, reviewer){
        return this.bidFor(paper, reviewer).interest();
    }
}

module.exports = Session;
