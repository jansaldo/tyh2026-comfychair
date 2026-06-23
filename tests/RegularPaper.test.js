const RegularPaper = require("../src/RegularPaper");
const User = require('../src/User');

beforeEach( ()=> {
    juan = new User("Juan Gardey", "LIFIA, UNLP", "jgardey@lifia.ar", "123");
    julian = new User("Julián Grigera", "LIFIA, UNLP", "jgrigera@lifia.ar", "123");
    matias = new User("Matias Urbieta", "LIFIA, UNLP", "murbieta@lifia.ar", "123");
    paper01 = new RegularPaper("A new approach on something", [juan, julian], juan, "Lorem Ipsum dolor sit amet");
});

describe("A new RegularPaper", ()=>{
    it("should have an abstract", ()=>{
        let newPaper = new RegularPaper("An approach on something", [juan, matias, julian], juan, "Lorem ipsum");
        expect(newPaper.abstract()).not.toBe('');
    });
    it("should have its corresponding author amongst its list of authors", ()=>{
        let validPaper, invalidPaper;
        valid = ()=>{ validPaper = new RegularPaper("An approach on something", [juan, matias], juan, "Lorem ipsum");}
        invalid = ()=>{ invalidPaper = new RegularPaper("An approach on something", [juan, matias], julian, "Lorem ipsum");}
        expect(valid).not.toThrow();
        expect(invalid).toThrow();
    })
})

describe("A RegularPaper", ()=>{
    it("should only be valid if there are authors, title and <300 words abstract", ()=>{
        expect(paper01.isValid()).toBeTrue;
    });
    it("should be invalid if the abstract exceeds 300 words", ()=>{
        let abstract = "";
        for (i=0; i<300; i++) {
            abstract += "word "
        };
        paper01.setAbstract(abstract)
        expect(paper01.isValid()).toBe(true);
        abstract += "word ";
        paper01.setAbstract(abstract)
        expect(paper01.isValid()).toBe(false);
    });
    it("should copy an updated abstract from a valid regular paper", function shouldCopyUpdatedAbstract() {
        const candidate = new RegularPaper(
            "Updated regular paper",
            [juan, julian],
            julian,
            "Updated abstract"
        );

        paper01.updateFrom(candidate);

        expect(paper01.title()).toBe("Updated regular paper");
        expect(paper01.abstract()).toBe("Updated abstract");
    });
    it("should reject an overlong abstract without partial changes", function shouldRejectOverlongAbstractAtomically() {
        const originalTitle = paper01.title();
        const originalAbstract = paper01.abstract();
        const candidate = new RegularPaper(
            "Invalid replacement title",
            [juan, julian],
            juan,
            new Array(302).join("word ")
        );

        function updateWithOverlongAbstract() {
            paper01.updateFrom(candidate);
        }

        expect(updateWithOverlongAbstract).toThrow("Cannot update paper with invalid data");
        expect(paper01.title()).toBe(originalTitle);
        expect(paper01.abstract()).toBe(originalAbstract);
    });

})
