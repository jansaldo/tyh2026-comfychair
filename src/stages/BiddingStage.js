const {Bid} = require("../Bid");
const ReviewerAssigner = require("../ReviewerAssigner");
const ReviewingStage = require("./ReviewingStage");
const SessionStage = require("./SessionStage");

class BiddingStage extends SessionStage{
    constructor(){
        super("Bidding");
    }
    enterBid(session, paper, reviewer, interest){
        const existingBid = session.bidFor(paper, reviewer);

        if (typeof(existingBid) === "undefined") {
            session._addBid(new Bid(paper, reviewer, interest));
            return;
        }

        existingBid.setInterest(interest);
    }
    closeBidding(session){
        if (session.papers().length === 0) {
            throw new Error("Cannot close bidding without papers");
        }

        const assigner = new ReviewerAssigner();
        const assignments = assigner.assign(
            session.papers(),
            session.reviewers(),
            session.bids()
        );

        session._replaceAssignments(assignments);
        session._transitionTo(new ReviewingStage());
    }
}

module.exports = BiddingStage;
