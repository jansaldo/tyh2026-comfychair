const {Bid, Interests} = require("../src/Bid");
const Paper = require("../src/Paper");
const ReviewerAssigner = require("../src/ReviewerAssigner");
const User = require("../src/User");

let assigner;
let author;
let authorReviewer;
let interestedReviewer;
let maybeReviewer;
let noBidReviewer;
let notInterestedReviewer;
let reviewers;
let papers;
let bids;

function buildFixture() {
    assigner = new ReviewerAssigner();
    author = new User("author", "UNLP", "author@unlp.edu", "123");
    authorReviewer = new User("author-reviewer", "UNLP", "author-reviewer@unlp.edu", "123");
    interestedReviewer = new User("interested-reviewer", "UNLP", "interested@unlp.edu", "123");
    maybeReviewer = new User("maybe-reviewer", "UNLP", "maybe@unlp.edu", "123");
    noBidReviewer = new User("no-bid-reviewer", "UNLP", "no-bid@unlp.edu", "123");
    notInterestedReviewer = new User("not-interested-reviewer", "UNLP", "not-interested@unlp.edu", "123");
    reviewers = [interestedReviewer, maybeReviewer, noBidReviewer, notInterestedReviewer];
    papers = [
        new Paper("Paper 1", [author], author),
        new Paper("Paper 2", [author], author),
        new Paper("Paper 3", [author], author)
    ];
    bids = [
        new Bid(papers[0], interestedReviewer, Interests.Interested),
        new Bid(papers[0], maybeReviewer, Interests.Maybe),
        new Bid(papers[0], notInterestedReviewer, Interests.NotInterested)
    ];
}

function reviewerNamesFor(assignments, paper) {
    const reviewerNames = [];

    for (const assignment of assignments) {
        if (assignment.paper() === paper) {
            reviewerNames.push(assignment.reviewer().fullName);
        }
    }

    return reviewerNames;
}

function isAssigned(assignments, paper, reviewer) {
    for (const assignment of assignments) {
        if (assignment.matches(paper, reviewer)) {
            return true;
        }
    }

    return false;
}

function assignmentCountFor(assignments, paper) {
    let assignmentCount = 0;

    for (const assignment of assignments) {
        if (assignment.paper() === paper) {
            assignmentCount += 1;
        }
    }

    return assignmentCount;
}

beforeEach(buildFixture);

describe("A ReviewerAssigner", function reviewerAssignerSuite() {
    it("should calculate reviewer quotas using floor plus remainder", function shouldDistributeQuotaFairly() {
        const quotas = assigner.buildQuotas(reviewers, 3);

        expect(quotas[0].remaining()).toBe(3);
        expect(quotas[1].remaining()).toBe(2);
        expect(quotas[2].remaining()).toBe(2);
        expect(quotas[3].remaining()).toBe(2);
    });

    it("should prioritize interested before maybe before no bid before not interested", function shouldRespectBidPriority() {
        const assignments = assigner.assign([papers[0]], reviewers, bids);

        expect(reviewerNamesFor(assignments, papers[0])).toEqual([
            "interested-reviewer",
            "maybe-reviewer",
            "no-bid-reviewer"
        ]);
    });

    it("should never assign an author to review the paper", function shouldSkipConflictedAuthors() {
        const conflictedPaper = new Paper("Conflicted paper", [authorReviewer], authorReviewer);
        const availableReviewers = [interestedReviewer, maybeReviewer, noBidReviewer, authorReviewer];

        const assignments = assigner.assign([conflictedPaper], availableReviewers, []);

        expect(isAssigned(assignments, conflictedPaper, authorReviewer)).toBe(false);
        expect(reviewerNamesFor(assignments, conflictedPaper)).toEqual([
            "interested-reviewer",
            "maybe-reviewer",
            "no-bid-reviewer"
        ]);
    });

    it("should fail when a paper cannot reach three non conflicted reviewers", function shouldFailWhenAssignmentIsImpossible() {
        const conflictedPaper = new Paper("Impossible paper", [authorReviewer], authorReviewer);
        const onlyTwoEligibleReviewers = [interestedReviewer, maybeReviewer, authorReviewer];

        function assignImpossibleCase() {
            assigner.assign([conflictedPaper], onlyTwoEligibleReviewers, []);
        }

        expect(assignImpossibleCase).toThrow("Cannot assign 3 reviewers to every paper");
    });

    it("should preserve enough reviewer capacity for later papers", function shouldPreserveCapacityForLaterPapers() {
        const fourPapers = [
            new Paper("Paper 1", [author], author),
            new Paper("Paper 2", [author], author),
            new Paper("Paper 3", [author], author),
            new Paper("Paper 4", [author], author)
        ];

        const assignments = assigner.assign(fourPapers, reviewers, []);

        expect(assignmentCountFor(assignments, fourPapers[0])).toBe(3);
        expect(assignmentCountFor(assignments, fourPapers[1])).toBe(3);
        expect(assignmentCountFor(assignments, fourPapers[2])).toBe(3);
        expect(assignmentCountFor(assignments, fourPapers[3])).toBe(3);
    });
});
