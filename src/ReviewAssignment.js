class ReviewAssignment{
    constructor(paper, reviewer){
        this._paper = paper;
        this._reviewer = reviewer;
    }
    paper(){
        return this._paper;
    }
    reviewer(){
        return this._reviewer;
    }
    matches(paper, reviewer){
        return this._paper === paper && this._reviewer === reviewer;
    }
}

module.exports = ReviewAssignment;
