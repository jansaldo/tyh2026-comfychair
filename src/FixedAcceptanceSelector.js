class FixedAcceptanceSelector{
    select(papers, percentage){
        const orderedPapers = this.orderByScoreAndSubmissionOrder(papers);
        const acceptedCount = Math.floor((orderedPapers.length * percentage) / 100);

        return orderedPapers.slice(0, acceptedCount);
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
            if (this.shouldInsertBefore(paper, orderedPapers[index])) {
                orderedPapers.splice(index, 0, paper);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            orderedPapers.push(paper);
        }
    }
    shouldInsertBefore(candidatePaper, orderedPaper){
        return candidatePaper.score() > orderedPaper.score();
    }
}

module.exports = FixedAcceptanceSelector;
