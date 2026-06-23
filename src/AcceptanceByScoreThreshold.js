const AcceptancePolicy = require("./AcceptancePolicy");

class AcceptanceByScoreThreshold extends AcceptancePolicy{
    constructor(minimumScore){
        super();

        if (!Number.isFinite(minimumScore)) {
            throw new Error("Score threshold must be a finite number");
        }

        this._minimumScore = minimumScore;
    }
    select(papers){
        const orderedPapers = this.orderByScoreAndSubmissionOrder(papers);
        const acceptedPapers = [];

        for (const paper of orderedPapers) {
            if (paper.score() >= this._minimumScore) {
                acceptedPapers.push(paper);
            }
        }

        return acceptedPapers;
    }
}

module.exports = AcceptanceByScoreThreshold;
