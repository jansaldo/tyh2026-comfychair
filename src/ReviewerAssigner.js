const {Interests} = require("./Bid");
const Paper = require("./Paper");
const ReviewAssignment = require("./ReviewAssignment");
const ReviewerQuota = require("./ReviewerQuota");

class ReviewerAssigner{
    buildQuotas(reviewers, paperCount){
        const totalReviews = paperCount * Paper.allowedReviews;
        const baseQuota = Math.floor(totalReviews / reviewers.length);
        const remainder = totalReviews % reviewers.length;
        const quotas = [];

        for (let index = 0; index < reviewers.length; index += 1) {
            let reviewerCapacity = baseQuota;

            if (index < remainder) {
                reviewerCapacity += 1;
            }

            quotas.push(new ReviewerQuota(reviewers[index], reviewerCapacity));
        }

        return quotas;
    }
    assign(papers, reviewers, bids){
        const quotas = this.buildQuotas(reviewers, papers.length);
        const assignments = [];

        for (const paper of papers) {
            this.assignPaper(paper, quotas, bids, assignments);
        }

        return assignments;
    }
    assignPaper(paper, quotas, bids, assignments){
        const initialAssignmentCount = assignments.length;

        for (let priority = 0; priority <= 3; priority += 1) {
            this.assignCandidatesWithPriority(paper, quotas, bids, assignments, priority);
        }

        if (assignments.length - initialAssignmentCount !== Paper.allowedReviews) {
            throw new Error("Cannot assign " + Paper.allowedReviews + " reviewers to every paper");
        }
    }
    assignCandidatesWithPriority(paper, quotas, bids, assignments, priority){
        const orderedQuotas = this.quotasByRemainingCapacity(quotas);

        for (const quota of orderedQuotas) {
            if (this.assignedReviewersCountFor(paper, assignments) === Paper.allowedReviews) {
                return;
            }

            if (this.shouldAssignCandidate(paper, quota, bids, assignments, priority)) {
                this.assignReviewer(paper, quota, assignments);
            }
        }
    }
    quotasByRemainingCapacity(quotas){
        const orderedQuotas = [];

        for (const quota of quotas) {
            this.insertQuotaByRemainingCapacity(orderedQuotas, quota);
        }

        return orderedQuotas;
    }
    insertQuotaByRemainingCapacity(orderedQuotas, quota){
        let inserted = false;

        for (let index = 0; index < orderedQuotas.length; index += 1) {
            if (quota.remaining() > orderedQuotas[index].remaining()) {
                orderedQuotas.splice(index, 0, quota);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            orderedQuotas.push(quota);
        }
    }
    shouldAssignCandidate(paper, quota, bids, assignments, priority){
        return quota.hasCapacity()
            && !paper.hasAuthor(quota.reviewer())
            && !this.hasConflictBid(paper, quota.reviewer(), bids)
            && !this.isAlreadyAssigned(paper, quota.reviewer(), assignments)
            && this.priorityFor(paper, quota.reviewer(), bids) === priority;
    }
    assignReviewer(paper, quota, assignments){
        assignments.push(new ReviewAssignment(paper, quota.reviewer()));
        quota.consume();
    }
    assignedReviewersCountFor(paper, assignments){
        let assignmentCount = 0;

        for (const assignment of assignments) {
            if (assignment.paper() === paper) {
                assignmentCount += 1;
            }
        }

        return assignmentCount;
    }
    isAlreadyAssigned(paper, reviewer, assignments){
        for (const assignment of assignments) {
            if (assignment.matches(paper, reviewer)) {
                return true;
            }
        }

        return false;
    }
    priorityFor(paper, reviewer, bids){
        const bid = this.bidFor(paper, reviewer, bids);

        if (typeof(bid) === "undefined") {
            return 2;
        }

        return this.priorityForInterest(bid.interest());
    }
    priorityForInterest(interest){
        if (interest === Interests.Interested) {
            return 0;
        }

        if (interest === Interests.Maybe) {
            return 1;
        }

        return 3;
    }
    hasConflictBid(paper, reviewer, bids){
        const bid = this.bidFor(paper, reviewer, bids);

        return typeof(bid) !== "undefined" && bid.interest() === Interests.Conflict;
    }
    bidFor(paper, reviewer, bids){
        for (const bid of bids) {
            if (bid.paper() === paper && bid.reviewer() === reviewer) {
                return bid;
            }
        }
    }
}

module.exports = ReviewerAssigner;
