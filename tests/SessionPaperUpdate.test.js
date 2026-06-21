const Poster = require("../src/Poster");
const RegularPaper = require("../src/RegularPaper");
const Session = require("../src/Session");
const User = require("../src/User");

let session;
let author;
let coauthor;
let outsider;
let regularPaper;
let poster;

beforeEach(function buildFixture() {
    session = new Session();
    author = new User("author", "UNLP", "author@unlp.edu", "123");
    coauthor = new User("coauthor", "UNLP", "coauthor@unlp.edu", "123");
    outsider = new User("outsider", "UNLP", "outsider@unlp.edu", "123");
    regularPaper = new RegularPaper(
        "Original regular",
        [author, coauthor],
        author,
        "Original abstract"
    );
    poster = new Poster(
        "Original poster",
        [author],
        author,
        "https://example.com/original.pdf",
        "https://example.com/original.zip"
    );
    session.submit(regularPaper);
    session.submit(poster);
});

describe("Paper updates during receiving", function paperUpdatesSuite() {
    it("should let any current author update a submitted regular paper", function shouldAllowCoauthorUpdate() {
        const candidate = new RegularPaper(
            "Updated regular",
            [coauthor, outsider],
            coauthor,
            "Updated abstract"
        );

        session.updatePaper(regularPaper, coauthor, candidate);

        expect(regularPaper.title()).toBe("Updated regular");
        expect(regularPaper.authors()).toEqual([coauthor, outsider]);
        expect(regularPaper.correspondingAuthor()).toBe(coauthor);
        expect(regularPaper.abstract()).toBe("Updated abstract");
    });

    it("should preserve submission identity and order", function shouldPreserveIdentityAndOrder() {
        const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");

        session.updatePaper(regularPaper, author, candidate);

        expect(session.papers()[0]).toBe(regularPaper);
        expect(session.papers()[1]).toBe(poster);
    });

    it("should update poster-specific data", function shouldUpdatePosterData() {
        const candidate = new Poster(
            "Updated poster",
            [author],
            author,
            "https://example.com/updated.pdf",
            "https://example.com/updated.zip"
        );

        session.updatePaper(poster, author, candidate);

        expect(poster.attachmentUrl()).toBe("https://example.com/updated.pdf");
        expect(poster.sourcesUrl()).toBe("https://example.com/updated.zip");
    });

    it("should reject a non author without changing the paper", function shouldRejectNonAuthor() {
        const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");

        function updateAsOutsider() {
            session.updatePaper(regularPaper, outsider, candidate);
        }

        expect(updateAsOutsider).toThrow("Only an author can update this paper");
        expect(regularPaper.title()).toBe("Original regular");
        expect(regularPaper.abstract()).toBe("Original abstract");
    });

    it("should reject a paper not submitted to the session", function shouldRejectForeignPaper() {
        const foreignPaper = new RegularPaper("Foreign", [author], author, "Foreign abstract");
        const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");

        function updateForeignPaper() {
            session.updatePaper(foreignPaper, author, candidate);
        }

        expect(updateForeignPaper).toThrow("Paper was not submitted to this session");
        expect(session.papers()).toEqual([regularPaper, poster]);
    });

    it("should reject invalid replacement data atomically", function shouldRejectInvalidDataAtomically() {
        const candidate = new RegularPaper(
            "Invalid new title",
            [author],
            author,
            new Array(302).join("word ")
        );

        function updateWithInvalidData() {
            session.updatePaper(regularPaper, author, candidate);
        }

        expect(updateWithInvalidData).toThrow("Cannot update paper with invalid data");
        expect(regularPaper.title()).toBe("Original regular");
        expect(regularPaper.abstract()).toBe("Original abstract");
    });

    it("should reject updates after submissions close", function shouldRejectUpdateAfterDeadline() {
        const candidate = new RegularPaper("Updated", [author], author, "Updated abstract");
        session.closeSubmissions();

        function updateAfterDeadline() {
            session.updatePaper(regularPaper, author, candidate);
        }

        expect(updateAfterDeadline).toThrow("Cannot update papers during Bidding stage");
        expect(session.stage()).toBe("Bidding");
        expect(regularPaper.title()).toBe("Original regular");
        expect(regularPaper.abstract()).toBe("Original abstract");
    });
});
