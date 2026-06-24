const FixedAcceptanceSelector = require("./FixedAcceptanceSelector");
const ReceivingStage = require("./stages/ReceivingStage");

class Session{
    constructor(){
        this._name = "";
        this._programCommittee=[];
        this._papers=[];
        this._bids=[];
        this._assignments=[];
        this._acceptedPapers=[];
        this._stage=new ReceivingStage();
        this._acceptancePolicy=new FixedAcceptanceSelector(0);
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
        return this._stage.canSubmit(paper);
    }
    submit(paper){
        return this._stage.submit(this, paper);
    }
    updatePaper(paper, author, candidatePaper){
        return this._stage.updatePaper(this, paper, author, candidatePaper);
    }
    papers(){
        return this._papers;
    }
    bids(){
        return this._bids;
    }
    stage(){
        return this._stage.name();
    }
    closeSubmissions(){
        return this._stage.closeSubmissions(this);
    }
    enterBid(paper, reviewer, interest){
        return this._stage.enterBid(this, paper, reviewer, interest);
    }
    closeBidding(){
        return this._stage.closeBidding(this);
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
        return this._stage.submitReview(this, paper, reviewer, text, score);
    }
    closeReviewing(){
        return this._stage.closeReviewing(this);
    }
    setAcceptancePolicy(policy){
        if (typeof(policy) !== "object" || policy === null || typeof(policy.select) !== "function") {
            throw new Error("Acceptance policy must implement select(papers)");
        }

        this._acceptancePolicy = policy;
        this._acceptedPapers = [];
    }
    acceptancePolicy(){
        return this._acceptancePolicy;
    }
    setAcceptancePercentage(percentage){
        this.setAcceptancePolicy(new FixedAcceptanceSelector(percentage));
    }
    selectAcceptedPapers(){
        return this._stage.selectAcceptedPapers(this);
    }
    acceptedPapers(){
        return this._stage.acceptedPapers(this);
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
        const bid = this.bidFor(paper, reviewer);

        if (typeof(bid) === "undefined") {
            throw new Error("No bid found for paper and reviewer");
        }

        return bid.interest();
    }
    _transitionTo(stage){
        this._stage = stage;
    }
    _addPaper(paper){
        this._papers.push(paper);
    }
    _containsPaper(paper){
        return this._papers.includes(paper);
    }
    _addBid(bid){
        this._bids.push(bid);
    }
    _replaceAssignments(assignments){
        this._assignments = assignments;
    }
    _replaceAcceptedPapers(papers){
        this._acceptedPapers = papers;
    }
}

module.exports = Session;
