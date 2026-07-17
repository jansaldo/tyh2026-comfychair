const {Interests} = require("../src/Bid");
const Paper = require("../src/Paper");
const Session = require("../src/Session");
const User = require("../src/User");
const BiddingStage = require("../src/stages/BiddingStage");

function buildFixtureAt(stageName) {
    const session = new Session();
    const author = new User("author", "UNLP", "author@unlp.edu", "123");
    const reviewers = [
        new User("reviewer-1", "UNLP", "reviewer1@unlp.edu", "123"),
        new User("reviewer-2", "UNLP", "reviewer2@unlp.edu", "123"),
        new User("reviewer-3", "UNLP", "reviewer3@unlp.edu", "123"),
        new User("reviewer-4", "UNLP", "reviewer4@unlp.edu", "123")
    ];
    const paper = new Paper("Submitted paper", [author], author);

    for (const reviewer of reviewers) {
        session.addReviewer(reviewer);
    }

    session.submit(paper);

    if (stageName !== "Receiving") {
        session.closeSubmissions();
    }

    if (stageName === "Reviewing" || stageName === "Selection") {
        session.closeBidding();
    }

    if (stageName === "Selection") {
        for (const assignedReviewer of session.assignedReviewersFor(paper)) {
            session.submitReview(paper, assignedReviewer, "Review", 1);
        }
        session.closeReviewing();
    }

    return {session, paper, author, reviewer: reviewers[0]};
}

function operationCases(session, paper, author, reviewer) {
    const candidate = new Paper("Updated", [author], author);

    return [
        {allowed: "Receiving", action: "submit papers", invoke: function submitPaper() { session.submit(candidate); }},
        {allowed: "Receiving", action: "update papers", invoke: function updatePaper() { session.updatePaper(paper, author, candidate); }},
        {allowed: "Receiving", action: "close submissions", invoke: function closeSubmissions() { session.closeSubmissions(); }},
        {allowed: "Bidding", action: "enter bids", invoke: function enterBid() { session.enterBid(paper, reviewer, Interests.Maybe); }},
        {allowed: "Bidding", action: "close bidding", invoke: function closeBidding() { session.closeBidding(); }},
        {allowed: "Reviewing", action: "submit reviews", invoke: function submitReview() { session.submitReview(paper, reviewer, "Review", 1); }},
        {allowed: "Reviewing", action: "close reviewing", invoke: function closeReviewing() { session.closeReviewing(); }},
        {allowed: "Selection", action: "select accepted papers", invoke: function selectPapers() { session.selectAcceptedPapers(); }},
        {allowed: "Selection", action: "query accepted papers", invoke: function queryPapers() { session.acceptedPapers(); }}
    ];
}

function operationCasesForStage(stageName) {
    const cases = [];

    for (let index = 0; index < 9; index += 1) {
        const fixture = buildFixtureAt(stageName);
        const operationCase = operationCases(
            fixture.session,
            fixture.paper,
            fixture.author,
            fixture.reviewer
        )[index];
        operationCase.session = fixture.session;
        cases.push(operationCase);
    }

    return cases;
}

describe("Session operations by stage", function sessionStagesSuite() {
    for (const stageName of ["Receiving", "Bidding", "Reviewing", "Selection"]) {
        for (const operationCase of operationCasesForStage(stageName)) {
            if (operationCase.allowed !== stageName) {
                it(
                    "should reject " + operationCase.action + " during " + stageName,
                    function shouldRejectOperationWithoutMutation() {
                        const stageBefore = operationCase.session.stage();
                        const papersBefore = operationCase.session.papers().slice();
                        const bidsBefore = operationCase.session.bids().slice();

                        expect(operationCase.invoke).toThrow(
                            "Cannot " + operationCase.action + " during " + stageName + " stage"
                        );
                        expect(operationCase.session.stage()).toBe(stageBefore);
                        expect(operationCase.session.papers()).toEqual(papersBefore);
                        expect(operationCase.session.bids()).toEqual(bidsBefore);
                    }
                );
            }
        }
    }
});

describe("Session stage closing preconditions", function sessionStageClosingPreconditions() {
    it("should keep receiving open when closing submissions without papers", function shouldRequirePapersToCloseSubmissions() {
        const session = new Session();

        expect(function closeEmptySubmissions() {
            session.closeSubmissions();
        }).toThrow("Cannot close submissions without papers");
        expect(session.stage()).toBe("Receiving");
    });

    it("should keep bidding open when closing bidding without papers", function shouldRequirePapersToCloseBidding() {
        const session = new Session();
        session._transitionTo(new BiddingStage());

        expect(function closeEmptyBidding() {
            session.closeBidding();
        }).toThrow("Cannot close bidding without papers");
        expect(session.stage()).toBe("Bidding");
    });
});
