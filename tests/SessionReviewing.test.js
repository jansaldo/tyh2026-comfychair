const {Interests} = require("../src/Bid");
const Paper = require("../src/Paper");
const Session = require("../src/Session");
const User = require("../src/User");

let session;
let author;
let externalReviewer;
let reviewers;
let papers;

function buildFixture() {
    session = new Session();
    author = new User("author", "UNLP", "author@unlp.edu", "123");
    externalReviewer = new User("external-reviewer", "UNLP", "external@unlp.edu", "123");
    reviewers = [
        new User("reviewer-1", "UNLP", "reviewer1@unlp.edu", "123"),
        new User("reviewer-2", "UNLP", "reviewer2@unlp.edu", "123"),
        new User("reviewer-3", "UNLP", "reviewer3@unlp.edu", "123"),
        new User("reviewer-4", "UNLP", "reviewer4@unlp.edu", "123")
    ];
    papers = [
        new Paper("Paper 1", [author], author),
        new Paper("Paper 2", [author], author)
    ];

    addReviewers(session, reviewers);
    submitPapers(session, papers);
}

function addReviewers(targetSession, targetReviewers) {
    for (const reviewer of targetReviewers) {
        targetSession.addReviewer(reviewer);
    }
}

function submitPapers(targetSession, targetPapers) {
    for (const paper of targetPapers) {
        targetSession.submit(paper);
    }
}

function registerBidsForHappyPath(targetSession, targetPapers, targetReviewers) {
    targetSession.enterBid(targetPapers[0], targetReviewers[0], Interests.Interested);
    targetSession.enterBid(targetPapers[0], targetReviewers[1], Interests.Maybe);
    targetSession.enterBid(targetPapers[1], targetReviewers[0], Interests.Interested);
}

function moveSessionToReviewingWithAssignments(targetSession, targetPapers, targetReviewers) {
    targetSession.closeSubmissions();
    registerBidsForHappyPath(targetSession, targetPapers, targetReviewers);
    targetSession.closeBidding();
}

function submitOnlyPartOfTheRequiredReviews(targetSession, targetPapers, targetReviewers) {
    targetSession.submitReview(targetPapers[0], targetReviewers[0], "First review", 1);
}

beforeEach(buildFixture);

describe("A Session during reviewing", function sessionReviewingSuite() {
    it("should allow an assigned reviewer to submit a review during reviewing", function shouldAllowAssignedReviewSubmission() {
        moveSessionToReviewingWithAssignments(session, papers, reviewers);

        session.submitReview(papers[0], reviewers[0], "Clear contribution", 2);

        expect(papers[0].reviews()).toHaveLength(1);
        expect(papers[0].score()).toBe(2);
    });

    it("should reject reviews from non assigned reviewers", function shouldRejectNonAssignedReviewers() {
        moveSessionToReviewingWithAssignments(session, papers, reviewers);

        function submitUnassignedReview() {
            session.submitReview(papers[0], externalReviewer, "I was not assigned", 1);
        }

        expect(submitUnassignedReview).toThrow("Reviewer is not assigned to this paper");
    });

    it("should reject reviews outside reviewing stage", function shouldRejectReviewOutsideStage() {
        function submitReviewTooEarly() {
            session.submitReview(papers[0], reviewers[0], "Too early", 1);
        }

        expect(submitReviewTooEarly).toThrow("Session must be at stage Reviewing");
    });

    it("should not allow the same assigned reviewer to review twice", function shouldRejectDuplicateAssignedReview() {
        moveSessionToReviewingWithAssignments(session, papers, reviewers);
        session.submitReview(papers[0], reviewers[0], "First review", 1);

        function duplicateReview() {
            session.submitReview(papers[0], reviewers[0], "Second review", 0);
        }

        expect(duplicateReview).toThrow("Reviewer already reviewed this paper");
    });

    it("should not close reviewing until every paper has three reviews", function shouldBlockSelectionUntilReviewsAreComplete() {
        moveSessionToReviewingWithAssignments(session, papers, reviewers);
        submitOnlyPartOfTheRequiredReviews(session, papers, reviewers);

        function closeReviewing() {
            session.closeReviewing();
        }

        expect(closeReviewing).toThrow("Cannot close reviewing before all assigned reviews are submitted");
    });
});
