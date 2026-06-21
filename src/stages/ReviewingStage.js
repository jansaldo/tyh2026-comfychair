const SelectionStage = require("./SelectionStage");
const SessionStage = require("./SessionStage");

class ReviewingStage extends SessionStage{
    constructor(){
        super("Reviewing");
    }
    submitReview(session, paper, reviewer, text, score){
        if (!session.isReviewerAssignedTo(paper, reviewer)) {
            throw new Error("Reviewer is not assigned to this paper");
        }

        paper.addReview(reviewer, text, score);
    }
    closeReviewing(session){
        if (!this.allReviewsSubmitted(session)) {
            throw new Error("Cannot close reviewing before all assigned reviews are submitted");
        }

        session._transitionTo(new SelectionStage());
    }
    allReviewsSubmitted(session){
        for (const paper of session.papers()) {
            if (!this.allAssignedReviewsSubmittedFor(session, paper)) {
                return false;
            }
        }

        return true;
    }
    allAssignedReviewsSubmittedFor(session, paper){
        const assignedReviewers = session.assignedReviewersFor(paper);

        if (assignedReviewers.length !== paper.constructor.allowedReviews) {
            return false;
        }

        for (const reviewer of assignedReviewers) {
            if (!paper.hasReviewFrom(reviewer)) {
                return false;
            }
        }

        return true;
    }
}

module.exports = ReviewingStage;
