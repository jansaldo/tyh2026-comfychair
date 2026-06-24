const FixedAcceptanceSelector = require("../src/FixedAcceptanceSelector");
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

describe("FixedAcceptanceSelector", function fixedAcceptanceSelectorSuite() {
    it("should keep supporting the historical percentage argument", function shouldKeepHistoricalApi() {
        const papers = [paperWithScore("first", 1), paperWithScore("second", 3)];
        const selector = new FixedAcceptanceSelector();

        expect(selector.select(papers, 50)).toEqual([papers[1]]);
    });

    it("should use its configured percentage as a strategy", function shouldUseConfiguredPercentage() {
        const papers = [paperWithScore("first", 1), paperWithScore("second", 3)];
        const selector = new FixedAcceptanceSelector(50);

        expect(selector.select(papers)).toEqual([papers[1]]);
    });

    it("should preserve submission order for tied scores", function shouldPreserveSubmissionOrder() {
        const papers = [paperWithScore("first", 2), paperWithScore("second", 2)];
        const selector = new FixedAcceptanceSelector(50);

        expect(selector.select(papers)).toEqual([papers[0]]);
    });

    it("should reject invalid configured percentages", function shouldRejectInvalidPercentage() {
        function createInvalidPolicy() {
            new FixedAcceptanceSelector(101);
        }

        expect(createInvalidPolicy).toThrow("Acceptance percentage must be between 0 and 100");
    });
});
