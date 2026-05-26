class ReviewerQuota{
    constructor(reviewer, capacity){
        this._reviewer = reviewer;
        this._capacity = capacity;
        this._remaining = capacity;
    }
    reviewer(){
        return this._reviewer;
    }
    remaining(){
        return this._remaining;
    }
    hasCapacity(){
        return this._remaining > 0;
    }
    consume(){
        if (!this.hasCapacity()) {
            throw new Error("Reviewer quota exhausted");
        }

        this._remaining -= 1;
    }
}

module.exports = ReviewerQuota;
