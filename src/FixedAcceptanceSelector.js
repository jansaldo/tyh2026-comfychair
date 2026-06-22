const AcceptancePolicy = require("./AcceptancePolicy");

class FixedAcceptanceSelector extends AcceptancePolicy{
    constructor(percentage){
        super();
        const configuredPercentage = typeof(percentage) === "undefined" ? 0 : percentage;
        this.assertValidPercentage(configuredPercentage);
        this._percentage = configuredPercentage;
    }
    select(papers, percentage){
        const selectedPercentage = typeof(percentage) === "undefined"
            ? this._percentage
            : percentage;
        this.assertValidPercentage(selectedPercentage);
        const orderedPapers = this.orderByScoreAndSubmissionOrder(papers);
        const acceptedCount = Math.floor((orderedPapers.length * selectedPercentage) / 100);

        return orderedPapers.slice(0, acceptedCount);
    }
    assertValidPercentage(percentage){
        if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
            throw new Error("Acceptance percentage must be between 0 and 100");
        }
    }
}

module.exports = FixedAcceptanceSelector;
