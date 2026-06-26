const Conference = require("./src/Conference");
const Session = require("./src/Session");
const User = require("./src/User");
const RegularPaper = require("./src/RegularPaper");
const Poster = require("./src/Poster");
const AcceptanceByCount = require("./src/AcceptanceByCount");
const AcceptanceByScoreThreshold = require("./src/AcceptanceByScoreThreshold");
const {Interests} = require("./src/Bid");

const TOPICS = ["IA aplicada", "Testing", "Arquitectura", "Datos", "UX"];
const NAMES = ["Ana", "Bruno", "Carla", "Diego", "Emma", "Fede", "Gina", "Hugo", "Iara", "Juan"];
const SURNAMES = ["Lopez", "Perez", "Sosa", "Diaz", "Ruiz", "Mendez", "Castro", "Suarez"];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function chance(probability) { return Math.random() < probability; }
function pick(items) { return items[randomInt(0, items.length - 1)]; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function namesOf(users) {
    const names = [];
    for (const user of users) names.push(user.fullName);
    return names.join(", ");
}
function sample(items, count) {
    const pool = items.slice();
    const chosen = [];
    while (chosen.length < count && pool.length > 0) {
        chosen.push(pool.splice(randomInt(0, pool.length - 1), 1)[0]);
    }
    return chosen;
}
function interestName(interest) {
    if (interest === Interests.Interested) return "interesado";
    if (interest === Interests.Maybe) return "quizas";
    return "no interesado";
}
function interestForSlot(slot) {
    if (slot < 3) return Interests.Interested;
    if (slot === 3) return Interests.Maybe;
    if (slot === 4 && chance(0.5)) return Interests.Maybe;
    return Interests.NotInterested;
}
function paperType(paper) { return paper instanceof Poster ? "Poster" : "Regular"; }
function paperLabel(paper) { return paperType(paper) + ' "' + paper.title() + '"'; }
function logStep(method, message) { console.log("\n- " + method + ": " + message); }
function papersLabel(papers) {
    if (papers.length === 0) return "ninguno";

    const labels = [];
    for (const paper of papers) labels.push(paperLabel(paper));
    return labels.join("; ");
}
function acceptedFlag(acceptedPapers, paper, flag) {
    if (acceptedPapers.includes(paper)) return flag;
    return "-";
}
function printPolicyResult(name, acceptedPapers, totalPapers) {
    console.log("  -> " + name + ": " + acceptedPapers.length + "/" + totalPapers + " aceptados: " + papersLabel(acceptedPapers));
}
function highestSubmittedScore(submissions) {
    let highestScore = Number.NEGATIVE_INFINITY;

    for (const submission of submissions) {
        highestScore = Math.max(highestScore, submission.paper.score());
    }

    return highestScore;
}
function buildUpdatedPaper(paper, index) {
    const authors = paper.authors().slice();
    const correspondingAuthor = paper.correspondingAuthor();
    const updatedTitle = paper.title() + " - version corregida";

    if (paper instanceof Poster) {
        return new Poster(
            updatedTitle,
            authors,
            correspondingAuthor,
            "https://demo.test/poster-" + index + "-corregido.pdf",
            "https://demo.test/poster-" + index + "-corregido.zip"
        );
    }

    return new RegularPaper(
        updatedTitle,
        authors,
        correspondingAuthor,
        "Resumen corregido antes del cierre de recepcion."
    );
}
function logExpectedRejection(method, message, action) {
    logStep(method, message);

    try {
        action();
        console.log("  ! La operacion no fue rechazada.");
    } catch (error) {
        console.log("  -> rechazo esperado: " + error.message);
    }
}
function buildUsers(role, count) {
    const users = [];
    for (let index = 0; index < count; index += 1) {
        const fullName = pick(NAMES) + " " + pick(SURNAMES) + " (" + role + " " + (index + 1) + ")";
        users.push(new User(fullName, "UNLP", role.toLowerCase() + (index + 1) + "@demo.test", "123"));
    }
    return users;
}
function buildPaper(index, authors) {
    const topic = pick(TOPICS);
    const title = topic + " caso " + (index + 1);
    if (chance(0.5)) return new RegularPaper(title, authors, authors[0], "Resumen breve y valido para la demo.");
    return new Poster(title, authors, authors[0], "https://demo.test/poster-" + index + ".pdf", "https://demo.test/poster-" + index + ".zip");
}

console.log("Demo en vivo de ComfyChair");

const conference = new Conference("ComfyChair Demo " + randomInt(100, 999));
const session = new Session();
const trackName = pick(TOPICS);
const chairs = buildUsers("Chair", randomInt(1, 2));
const reviewers = buildUsers("Reviewer", randomInt(6, 7));
const authors = buildUsers("Author", randomInt(5, 7));
const submissions = [];

logStep("Session.stage", 'La sesion arranca en etapa "' + session.stage() + '".');
logStep("Conference.new", 'Se crea la conferencia "' + conference.name() + '" con track "' + trackName + '".');
for (const chair of chairs) {
    logStep("Conference.addChair", "Se suma a " + chair.fullName + " como chair.");
    conference.addChair(chair);
}
logStep("Conference.addSession", "La conferencia registra su unica sesion demo.");
conference.addSession(session);
for (const reviewer of reviewers) {
    logStep("Session.addReviewer", reviewer.fullName + " entra al comite de programa.");
    session.addReviewer(reviewer);
}

for (let index = 0; index < randomInt(3, 4); index += 1) {
    const paper = buildPaper(index, sample(authors, randomInt(1, 3)));
    logStep("Paper.isValid", paperLabel(paper) + " valida formato: " + (paper.isValid() ? "ok" : "rechazado") + ".");
    logStep("Session.submit", "Entra " + paperLabel(paper) + " de " + namesOf(paper.authors()) + ".");
    session.submit(paper);
    submissions.push({paper: paper, signal: randomInt(-1, 3)});
}

const submissionToUpdate = submissions[0];
const originalPaperLabel = paperLabel(submissionToUpdate.paper);
const updateCandidate = buildUpdatedPaper(submissionToUpdate.paper, 1);
logStep("Session.updatePaper", submissionToUpdate.paper.correspondingAuthor().fullName + " actualiza " + originalPaperLabel + " antes del cierre de recepcion.");
session.updatePaper(submissionToUpdate.paper, submissionToUpdate.paper.correspondingAuthor(), updateCandidate);
console.log("  -> queda como " + paperLabel(submissionToUpdate.paper) + ".");

logStep("Session.closeSubmissions", "Se cierra Receiving y arranca Bidding.");
session.closeSubmissions();
console.log('  -> etapa actual: "' + session.stage() + '".');

const rejectedUpdateCandidate = buildUpdatedPaper(submissionToUpdate.paper, 2);
function updateAfterDeadline() {
    session.updatePaper(
        submissionToUpdate.paper,
        submissionToUpdate.paper.correspondingAuthor(),
        rejectedUpdateCandidate
    );
}
logExpectedRejection("Session.updatePaper", "Se intenta corregir el mismo paper despues del deadline.", updateAfterDeadline);

let enteredBids = 0;
for (let paperIndex = 0; paperIndex < submissions.length; paperIndex += 1) {
    for (let reviewerIndex = 0; reviewerIndex < reviewers.length; reviewerIndex += 1) {
        const interest = interestForSlot((reviewerIndex - paperIndex + reviewers.length) % reviewers.length);
        logStep("Session.enterBid", reviewers[reviewerIndex].fullName + " marca " + interestName(interest) + " para " + paperLabel(submissions[paperIndex].paper) + ".");
        session.enterBid(submissions[paperIndex].paper, reviewers[reviewerIndex], interest);
        enteredBids += 1;
    }
}

logStep("Session.closeBidding", "Se calculan asignaciones segun bids y cupos.");
session.closeBidding();
console.log('  -> etapa actual: "' + session.stage() + '".');
for (const submission of submissions) {
    console.log("  -> " + paperLabel(submission.paper) + " queda con: " + namesOf(session.assignedReviewersFor(submission.paper)));
}

for (const submission of submissions) {
    for (const reviewer of session.assignedReviewersFor(submission.paper)) {
        const score = clamp(submission.signal + randomInt(-1, 1), -3, 3);
        logStep("Session.submitReview", reviewer.fullName + " revisa " + paperLabel(submission.paper) + " con score " + score + ".");
        session.submitReview(submission.paper, reviewer, "Revision corta de demo", score);
    }
    console.log("  -> score final de " + paperLabel(submission.paper) + ": " + submission.paper.score().toFixed(2));
}

logStep("Session.closeReviewing", "Todas las revisiones llegaron; pasa a Selection.");
session.closeReviewing();
console.log('  -> etapa actual: "' + session.stage() + '".');

const acceptancePercentage = pick([40, 50, 60]);
logStep("Session.setAcceptancePercentage", "Se fija corte de aceptacion en " + acceptancePercentage + "%.");
session.setAcceptancePercentage(acceptancePercentage);
logStep("Session.selectAcceptedPapers", "Se seleccionan los mejores papers por porcentaje fijo.");
const acceptedByPercentage = session.selectAcceptedPapers();
printPolicyResult("porcentaje fijo " + acceptancePercentage + "%", acceptedByPercentage, submissions.length);

const maximumAcceptedCount = Math.min(2, submissions.length);
logStep("Session.setAcceptancePolicy", "Se cambia a politica por cupo fijo: maximo " + maximumAcceptedCount + " papers.");
session.setAcceptancePolicy(new AcceptanceByCount(maximumAcceptedCount));
const acceptedByCount = session.selectAcceptedPapers();
printPolicyResult("cupo fijo " + maximumAcceptedCount, acceptedByCount, submissions.length);

const scoreThreshold = highestSubmittedScore(submissions);
logStep("Session.setAcceptancePolicy", "Se cambia a politica por score minimo: " + scoreThreshold.toFixed(2) + ".");
session.setAcceptancePolicy(new AcceptanceByScoreThreshold(scoreThreshold));
const acceptedByThreshold = session.selectAcceptedPapers();
printPolicyResult("score minimo " + scoreThreshold.toFixed(2), acceptedByThreshold, submissions.length);

let regularCount = 0;
for (const submission of submissions) if (!(submission.paper instanceof Poster)) regularCount += 1;

console.log("\nResumen final de la conferencia");
console.log("Conferencia: " + conference.name());
console.log("Track demo: " + trackName);
console.log("Chairs: " + conference.chairs().length + " | Reviewers: " + session.reviewers().length);
console.log("Papers enviados: " + submissions.length + " (" + regularCount + " regulares, " + (submissions.length - regularCount) + " posters)");
console.log("Bids cargados: " + enteredBids + " | Revisiones enviadas: " + (submissions.length * 3));
console.log("Aceptados por porcentaje: " + acceptedByPercentage.length + "/" + submissions.length + " con corte " + acceptancePercentage + "%");
console.log("Aceptados por cupo fijo: " + acceptedByCount.length + "/" + submissions.length + " con maximo " + maximumAcceptedCount);
console.log("Aceptados por score minimo: " + acceptedByThreshold.length + "/" + submissions.length + " con umbral " + scoreThreshold.toFixed(2));
for (const submission of submissions) {
    const percentageStatus = acceptedFlag(acceptedByPercentage, submission.paper, "porcentaje");
    const countStatus = acceptedFlag(acceptedByCount, submission.paper, "cupo");
    const thresholdStatus = acceptedFlag(acceptedByThreshold, submission.paper, "score");
    console.log(
        " - " + paperLabel(submission.paper) +
        " | score " + submission.paper.score().toFixed(2) +
        " | politicas: " + percentageStatus + "/" + countStatus + "/" + thresholdStatus
    );
}
