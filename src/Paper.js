const Review = require("./Review");

class Paper{
    constructor(title, authors, correspondingAuthor){
        if(!authors.includes(correspondingAuthor)) throw new Error("Corresponding author must be an author");
        this._title = title;
        this._reviews = [];
        this._authors = authors;
        this._correspondingAuthor = correspondingAuthor;
    }
    title(){
        return this._title;
    }
    reviews(){
        return this._reviews;
    }
    authors(){
        return this._authors;
    }
    correspondingAuthor(){
        return this._correspondingAuthor;
    }
    hasAuthor(user){
        return this._authors.includes(user);
    }
    isValid(){
        return (this._title !== "") && (this._authors.length > 0);
    }
    hasReviewFrom(reviewer){
        for (const existingReview of this._reviews) {
            if (existingReview.reviewer() === reviewer) {
                return true;
            }
        }

        return false;
    }
    addReview(reviewer, review, score){
        if (this.hasReviewFrom(reviewer)) {
            throw new Error("Reviewer already reviewed this paper");
        }

        if (this.reviewsCount() < this.constructor.allowedReviews)
            this._reviews.push(new Review(reviewer, review, score));
        else throw(new Error("Cannot allow any more reviews"))
    }
    reviewsCount(){
        return this.reviews().length;
    }
    updateFrom(candidatePaper){
        this.assertValidUpdateCandidate(candidatePaper);
        this._title = candidatePaper.title();
        this._authors = candidatePaper.authors().slice();
        this._correspondingAuthor = candidatePaper.correspondingAuthor();
        this.copySpecificEditableDataFrom(candidatePaper);
    }
    assertValidUpdateCandidate(candidatePaper){
        if (candidatePaper === this) {
            throw new Error("Updated paper must be a different object");
        }

        if (candidatePaper.constructor !== this.constructor) {
            throw new Error("Updated paper must keep its type");
        }

        if (!candidatePaper.isValid()) {
            throw new Error("Cannot update paper with invalid data");
        }
    }
    copySpecificEditableDataFrom(candidatePaper){
    }
    score(){
        if (this.reviewsCount() === 0){
            return 0;
        }

        let totalScore = 0;
        for (const review of this._reviews) {
            totalScore += review.score();
        }

        return totalScore / this.reviewsCount();
    }
}

Paper.allowedReviews = 3;

module.exports = Paper;
