const AcceptancePolicy = require("./AcceptancePolicy");

class AcceptanceByCount extends AcceptancePolicy{
    constructor(maximumCount){
        super();

        if (!Number.isInteger(maximumCount) || maximumCount < 0) {
            throw new Error("Maximum accepted paper count must be a non-negative integer");
        }

        this._maximumCount = maximumCount;
    }
    select(papers){
        return this.orderByScoreAndSubmissionOrder(papers).slice(0, this._maximumCount);
    }
}

module.exports = AcceptanceByCount;
