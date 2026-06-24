class AcceptancePolicy{
    select(papers){
        throw new Error("Acceptance policy must implement select(papers)");
    }
    orderByScoreAndSubmissionOrder(papers){
        const orderedPapers = [];

        for (const paper of papers) {
            this.insertPaperByScore(orderedPapers, paper);
        }

        return orderedPapers;
    }
    insertPaperByScore(orderedPapers, paper){
        let inserted = false;

        for (let index = 0; index < orderedPapers.length; index += 1) {
            if (paper.score() > orderedPapers[index].score()) {
                orderedPapers.splice(index, 0, paper);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            orderedPapers.push(paper);
        }
    }
}

module.exports = AcceptancePolicy;
