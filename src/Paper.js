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
    isValid(){
        return (this._title !== "") && (this._authors.length > 0);
    }
    addReview(reviewer, review, score){
        if (this.reviewsCount() < this.constructor.allowedReviews)
            this._reviews.push(new Review(reviewer, review, score));
        else throw(new Error("Cannot allow any more reviews"))
    }
    reviewsCount(){
        return this.reviews().length;
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
