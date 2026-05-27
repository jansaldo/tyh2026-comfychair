const {Interests} = require("../src/Bid");
const Paper = require("../src/Paper");
const Session = require("../src/Session");
const User = require("../src/User");

let session;
let author;
let reviewers;
let papers;

function buildFixture() {
    session = new Session();
    author = new User("author", "UNLP", "author@unlp.edu", "123");
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

function registerImpossibleBids(targetSession, targetPapers, targetReviewers) {
    targetSession.enterBid(targetPapers[0], targetReviewers[0], Interests.Interested);
}

beforeEach(buildFixture);

describe("A Session closing bidding", function sessionAssignmentSuite() {
    it("should move from bidding to reviewing and assign exactly three reviewers per paper", function shouldAssignThreeReviewersPerPaper() {
        session.closeSubmissions();
        registerBidsForHappyPath(session, papers, reviewers);

        session.closeBidding();

        expect(session.stage()).toBe("Reviewing");
        expect(session.assignedReviewersFor(papers[0])).toHaveLength(3);
        expect(session.assignedReviewersFor(papers[1])).toHaveLength(3);
    });

    it("should expose whether a reviewer is assigned to a paper", function shouldExposeAssignmentQueries() {
        session.closeSubmissions();
        registerBidsForHappyPath(session, papers, reviewers);

        session.closeBidding();

        expect(session.isReviewerAssignedTo(papers[0], reviewers[0])).toBe(true);
    });

    it("should keep the session in bidding when assignment is impossible", function shouldNotAdvanceOnImpossibleAssignment() {
        const impossibleSession = new Session();
        const insufficientReviewers = [reviewers[0], reviewers[1]];
        addReviewers(impossibleSession, insufficientReviewers);
        submitPapers(impossibleSession, papers);
        impossibleSession.closeSubmissions();
        registerImpossibleBids(impossibleSession, papers, insufficientReviewers);

        function closeBidding() {
            impossibleSession.closeBidding();
        }

        expect(closeBidding).toThrow("Cannot assign 3 reviewers to every paper");
        expect(impossibleSession.stage()).toBe("Bidding");
    });
});
