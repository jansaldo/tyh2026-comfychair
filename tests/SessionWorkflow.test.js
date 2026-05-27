const {Interests} = require("../src/Bid");
const Poster = require("../src/Poster");
const RegularPaper = require("../src/RegularPaper");
const Session = require("../src/Session");
const User = require("../src/User");

let session;
let author;
let authorReviewer;
let interestedReviewer;
let maybeReviewer;
let noBidReviewer;
let secondNoBidReviewer;
let notInterestedReviewer;
let reviewers;

function buildConferenceSessionWithReviewers() {
    session = new Session();
    author = new User("author", "UNLP", "author@unlp.edu", "123");
    authorReviewer = new User("author-reviewer", "UNLP", "author-reviewer@unlp.edu", "123");
    interestedReviewer = new User("interested-reviewer", "UNLP", "interested@unlp.edu", "123");
    maybeReviewer = new User("maybe-reviewer", "UNLP", "maybe@unlp.edu", "123");
    noBidReviewer = new User("no-bid-reviewer", "UNLP", "no-bid@unlp.edu", "123");
    secondNoBidReviewer = new User("second-no-bid-reviewer", "UNLP", "second-no-bid@unlp.edu", "123");
    notInterestedReviewer = new User("not-interested-reviewer", "UNLP", "not-interested@unlp.edu", "123");
    reviewers = [
        authorReviewer,
        interestedReviewer,
        maybeReviewer,
        noBidReviewer,
        secondNoBidReviewer,
        notInterestedReviewer
    ];

    for (const reviewer of reviewers) {
        session.addReviewer(reviewer);
    }
}

function submitValidPapers(targetSession) {
    const regularPaper = new RegularPaper(
        "A regular paper",
        [authorReviewer, author],
        authorReviewer,
        "This paper has a short abstract"
    );
    const poster = new Poster(
        "A poster",
        [author],
        author,
        "https://example.com/poster.pdf",
        "https://example.com/poster.zip"
    );
    const papers = [regularPaper, poster];

    for (const paper of papers) {
        targetSession.submit(paper);
    }

    return papers;
}

function registerMixedBids(targetSession, papers) {
    targetSession.enterBid(papers[0], authorReviewer, Interests.Interested);
    targetSession.enterBid(papers[0], interestedReviewer, Interests.Interested);
    targetSession.enterBid(papers[0], maybeReviewer, Interests.Maybe);
    targetSession.enterBid(papers[0], notInterestedReviewer, Interests.NotInterested);
    targetSession.enterBid(papers[1], maybeReviewer, Interests.Interested);
    targetSession.enterBid(papers[1], notInterestedReviewer, Interests.NotInterested);
}

function submitAllAssignedReviews(targetSession, papers) {
    submitAssignedReviewsForPaper(targetSession, papers[0], 2);
    submitAssignedReviewsForPaper(targetSession, papers[1], -1);
}

function submitAssignedReviewsForPaper(targetSession, paper, score) {
    const assignedReviewers = targetSession.assignedReviewersFor(paper);

    for (const reviewer of assignedReviewers) {
        targetSession.submitReview(paper, reviewer, "Review text", score);
    }
}

beforeEach(buildConferenceSessionWithReviewers);

describe("A complete conference session workflow", function sessionWorkflowSuite() {
    it("should complete the full session workflow from receiving to selection", function shouldCompleteFullWorkflow() {
        const papers = submitValidPapers(session);

        session.closeSubmissions();
        registerMixedBids(session, papers);
        session.closeBidding();

        expect(session.isReviewerAssignedTo(papers[0], authorReviewer)).toBe(false);

        submitAllAssignedReviews(session, papers);
        session.closeReviewing();
        session.setAcceptancePercentage(50);

        const acceptedPapers = session.selectAcceptedPapers();

        expect(session.stage()).toBe("Selection");
        expect(acceptedPapers).toHaveLength(1);
        expect(acceptedPapers[0]).toBe(papers[0]);
    });
});
