const AcceptanceByScoreThreshold = require("../src/AcceptanceByScoreThreshold");
const Paper = require("../src/Paper");
const User = require("../src/User");

let author;
let reviewer;

function buildFixture() {
    author = new User("author", "UNLP", "author@unlp.edu", "123");
    reviewer = new User("reviewer", "UNLP", "reviewer@unlp.edu", "123");
}

function paperWithScore(title, score) {
    const paper = new Paper(title, [author], author);
    paper.addReview(reviewer, "Review", score);
    return paper;
}

beforeEach(buildFixture);

describe("AcceptanceByScoreThreshold", function acceptanceByScoreThresholdSuite() {
    it("should accept scores above and equal to the threshold", function shouldApplyInclusiveThreshold() {
        const papers = [paperWithScore("below", 0), paperWithScore("equal", 1), paperWithScore("above", 3)];
        const policy = new AcceptanceByScoreThreshold(1);

        expect(policy.select(papers)).toEqual([papers[2], papers[1]]);
    });

    it("should not impose a result count limit", function shouldNotLimitCount() {
        const papers = [paperWithScore("one", 2), paperWithScore("two", 3), paperWithScore("three", 1)];

        expect(new AcceptanceByScoreThreshold(1).select(papers)).toHaveLength(3);
    });

    it("should preserve submission order between tied accepted papers", function shouldPreserveTiedSubmissionOrder() {
        const papers = [paperWithScore("one", 2), paperWithScore("two", 2)];

        expect(new AcceptanceByScoreThreshold(2).select(papers)).toEqual(papers);
    });

    it("should reject a non finite threshold", function shouldRejectInvalidThreshold() {
        function createInvalidPolicy() {
            new AcceptanceByScoreThreshold(Number.POSITIVE_INFINITY);
        }

        expect(createInvalidPolicy).toThrow("Score threshold must be a finite number");
    });
});
