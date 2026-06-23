const Paper = require("../src/Paper");
const Session = require("../src/Session");
const User = require("../src/User");

let session;
let author;
let reviewers;

function buildFixture() {
    session = new Session();
    author = new User("author", "UNLP", "author@unlp.edu", "123");
    reviewers = [
        new User("reviewer-1", "UNLP", "reviewer1@unlp.edu", "123"),
        new User("reviewer-2", "UNLP", "reviewer2@unlp.edu", "123"),
        new User("reviewer-3", "UNLP", "reviewer3@unlp.edu", "123"),
        new User("reviewer-4", "UNLP", "reviewer4@unlp.edu", "123")
    ];
}

function buildPapers(count) {
    const papers = [];

    for (let index = 1; index <= count; index += 1) {
        papers.push(new Paper("Paper " + index, [author], author));
    }

    return papers;
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

function moveSessionToSelection(targetSession, targetPapers, scores) {
    addReviewers(targetSession, reviewers);
    submitPapers(targetSession, targetPapers);
    targetSession.closeSubmissions();
    targetSession.closeBidding();
    submitAssignedReviews(targetSession, targetPapers, scores);
    targetSession.closeReviewing();
}

function submitAssignedReviews(targetSession, targetPapers, scores) {
    for (let paperIndex = 0; paperIndex < targetPapers.length; paperIndex += 1) {
        submitReviewsForPaper(targetSession, targetPapers[paperIndex], scores[paperIndex]);
    }
}

function submitReviewsForPaper(targetSession, paper, score) {
    const assignedReviewers = targetSession.assignedReviewersFor(paper);

    for (const reviewer of assignedReviewers) {
        targetSession.submitReview(paper, reviewer, "Review text", score);
    }
}

beforeEach(buildFixture);

describe("A Session during selection", function sessionSelectionSuite() {
    it("should accept the top scoring papers up to the configured percentage", function shouldAcceptTopScoringPapers() {
        const fourPapers = buildPapers(4);
        moveSessionToSelection(session, fourPapers, [2, 3, 1, 0]);
        session.setAcceptancePercentage(50);

        const acceptedPapers = session.selectAcceptedPapers();

        expect(acceptedPapers).toHaveLength(2);
        expect(acceptedPapers).toEqual([fourPapers[1], fourPapers[0]]);
    });

    it("should use floor so the acceptance ratio is never exceeded", function shouldUseFloorOnAcceptanceCutoff() {
        const threePapers = buildPapers(3);
        moveSessionToSelection(session, threePapers, [2, 3, 1]);
        session.setAcceptancePercentage(50);

        const acceptedPapers = session.selectAcceptedPapers();

        expect(acceptedPapers).toHaveLength(1);
    });

    it("should preserve submission order when scores tie", function shouldPreserveSubmissionOrderOnTie() {
        const papersWithSameScore = buildPapers(2);
        moveSessionToSelection(session, papersWithSameScore, [2, 2]);
        session.setAcceptancePercentage(50);

        const acceptedPapers = session.selectAcceptedPapers();

        expect(acceptedPapers[0]).toBe(papersWithSameScore[0]);
    });

    it("should reject selection outside selection stage", function shouldRejectSelectionOutsideStage() {
        function selectTooEarly() {
            session.selectAcceptedPapers();
        }

        expect(selectTooEarly).toThrow("Cannot select accepted papers during Receiving stage");
    });

    it("should reject invalid acceptance percentages", function shouldRejectInvalidPercentage() {
        function setInvalidPercentage() {
            session.setAcceptancePercentage(120);
        }

        expect(setInvalidPercentage).toThrow("Acceptance percentage must be between 0 and 100");
    });
});
