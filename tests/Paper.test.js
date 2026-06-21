const Paper = require("../src/Paper");
const Review = require("../src/Review");
const User = require("../src/User");

let paper;
let juan, julian, matias;
jest.mock("../src/User");

beforeEach(()=>{
    juan = new User();
    julian = new User();
    matias = new User();
    paper = new Paper("A Systematic Literature Review",[juan, matias],juan);
});

describe("A Paper", ()=>{
    it("should receive up to 3 reviews", ()=>{
        paper.addReview(julian, "Paper is terrible", -3);
        expect(paper.reviews()).toHaveLength(1);
        paper.addReview(juan, "Paper is bad", -2);
        paper.addReview(matias, "Paper is awesome", 3);
        let invalidReview = ()=>{paper.addReview(matias, "Paper is meh", 0);}
        expect(invalidReview).toThrow();
    })
    it("score should be the score average of its reviews", ()=>{
        expect(paper.score()).toBe(0);
        paper.addReview(juan, "Paper is terrible", -3);
        expect(paper.score()).toBe(-3);
        paper.addReview(julian, "Paper is bad", -2);
        expect(paper.score()).toBe(-2.5);
        paper.addReview(matias, "Paper is awesome", 3);
        expect(paper.score()).toBeCloseTo(-0.66666);
    })
    it("should know whether a user is one of its authors", function shouldKnowItsAuthors() {
        expect(paper.hasAuthor(juan)).toBe(true);
        expect(paper.hasAuthor(julian)).toBe(false);
    });
    it("should not accept two reviews from the same reviewer", function shouldRejectDuplicateReviewer() {
        paper.addReview(julian, "Paper is bad", -2);

        function duplicateReview() {
            paper.addReview(julian, "Paper is still bad", -1);
        }

        expect(duplicateReview).toThrow("Reviewer already reviewed this paper");
    });
    it("should copy editable common data from a valid candidate", function shouldCopyCommonData() {
        const newAuthor = new User();
        const candidate = new Paper("Updated title", [matias, newAuthor], matias);

        paper.updateFrom(candidate);

        expect(paper.title()).toBe("Updated title");
        expect(paper.authors()).toEqual([matias, newAuthor]);
        expect(paper.correspondingAuthor()).toBe(matias);
    });
    it("should preserve reviews when editable data changes", function shouldPreserveReviews() {
        paper.addReview(julian, "Existing review", 2);
        const candidate = new Paper("Updated title", [juan, matias], juan);

        paper.updateFrom(candidate);

        expect(paper.reviews()).toHaveLength(1);
        expect(paper.score()).toBe(2);
    });
    it("should reject an invalid candidate without changing valid data", function shouldRejectInvalidCandidateAtomically() {
        const previousAuthors = paper.authors().slice();
        const candidate = new Paper("", [julian], julian);

        function updateWithInvalidCandidate() {
            paper.updateFrom(candidate);
        }

        expect(updateWithInvalidCandidate).toThrow("Cannot update paper with invalid data");
        expect(paper.title()).toBe("A Systematic Literature Review");
        expect(paper.authors()).toEqual(previousAuthors);
        expect(paper.correspondingAuthor()).toBe(juan);
    });
    it("should reject using itself as update candidate", function shouldRejectSameObjectCandidate() {
        function updateFromItself() {
            paper.updateFrom(paper);
        }

        expect(updateFromItself).toThrow("Updated paper must be a different object");
    });
})
