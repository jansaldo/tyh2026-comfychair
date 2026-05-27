const Review = require("../src/Review");
const User = require("../src/User");

let reviewer;

function buildReviewer() {
    reviewer = new User("Reviewer One", "UNLP", "reviewer@unlp.edu", "123");
}

beforeEach(buildReviewer);

describe("A Review", function reviewSuite() {
    it("should keep reviewer, text and score", function shouldKeepState() {
        const review = new Review(reviewer, "Solid paper", 2);

        expect(review.reviewer()).toBe(reviewer);
        expect(review.text()).toBe("Solid paper");
        expect(review.score()).toBe(2);
    });

    it("should reject scores below -3", function shouldRejectScoreBelowRange() {
        function createInvalidReview() {
            new Review(reviewer, "Too harsh", -4);
        }

        expect(createInvalidReview).toThrow("Score must be an integer between -3 and 3");
    });

    it("should reject scores above 3", function shouldRejectScoreAboveRange() {
        function createInvalidReview() {
            new Review(reviewer, "Too optimistic", 4);
        }

        expect(createInvalidReview).toThrow("Score must be an integer between -3 and 3");
    });

    it("should reject non integer scores", function shouldRejectNonIntegerScore() {
        function createInvalidReview() {
            new Review(reviewer, "Half point", 1.5);
        }

        expect(createInvalidReview).toThrow("Score must be an integer between -3 and 3");
    });
});
