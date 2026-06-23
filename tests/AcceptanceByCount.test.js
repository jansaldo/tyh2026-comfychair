const AcceptanceByCount = require("../src/AcceptanceByCount");
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

describe("AcceptanceByCount", function acceptanceByCountSuite() {
    it("should accept the highest scoring papers up to the maximum", function shouldApplyMaximumCount() {
        const papers = [paperWithScore("one", 1), paperWithScore("two", 3), paperWithScore("three", 2)];
        const policy = new AcceptanceByCount(2);

        expect(policy.select(papers)).toEqual([papers[1], papers[2]]);
    });

    it("should accept none when maximum is zero", function shouldAcceptNone() {
        const papers = [paperWithScore("one", 1)];

        expect(new AcceptanceByCount(0).select(papers)).toEqual([]);
    });

    it("should accept all when maximum exceeds paper count", function shouldAcceptAll() {
        const papers = [paperWithScore("one", 1), paperWithScore("two", 2)];

        expect(new AcceptanceByCount(10).select(papers)).toEqual([papers[1], papers[0]]);
    });

    it("should preserve submission order at a tied cutoff", function shouldPreserveTiedSubmissionOrder() {
        const papers = [paperWithScore("one", 2), paperWithScore("two", 2)];

        expect(new AcceptanceByCount(1).select(papers)).toEqual([papers[0]]);
    });

    it("should reject a negative or fractional maximum", function shouldRejectInvalidMaximum() {
        function createNegativePolicy() {
            new AcceptanceByCount(-1);
        }
        function createFractionalPolicy() {
            new AcceptanceByCount(1.5);
        }

        expect(createNegativePolicy).toThrow("Maximum accepted paper count must be a non-negative integer");
        expect(createFractionalPolicy).toThrow("Maximum accepted paper count must be a non-negative integer");
    });
});
