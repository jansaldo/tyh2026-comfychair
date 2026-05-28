const Conference = require("./src/Conference");
const Session = require("./src/Session");
const User = require("./src/User");
const RegularPaper = require("./src/RegularPaper");
const Poster = require("./src/Poster");
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

logStep("Session.closeSubmissions", 'Se cierra Receiving y arranca Bidding. Etapa actual: "' + session.stage() + '" -> "Bidding".');
session.closeSubmissions();

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

const acceptancePercentage = pick([40, 50, 60]);
logStep("Session.setAcceptancePercentage", "Se fija corte de aceptacion en " + acceptancePercentage + "%.");
session.setAcceptancePercentage(acceptancePercentage);
logStep("Session.selectAcceptedPapers", "Se seleccionan los mejores papers por score.");
const acceptedPapers = session.selectAcceptedPapers();

let regularCount = 0;
for (const submission of submissions) if (!(submission.paper instanceof Poster)) regularCount += 1;

console.log("\nResumen final de la conferencia");
console.log("Conferencia: " + conference.name());
console.log("Track demo: " + trackName);
console.log("Chairs: " + conference.chairs().length + " | Reviewers: " + session.reviewers().length);
console.log("Papers enviados: " + submissions.length + " (" + regularCount + " regulares, " + (submissions.length - regularCount) + " posters)");
console.log("Bids cargados: " + enteredBids + " | Revisiones enviadas: " + (submissions.length * 3));
console.log("Aceptados: " + acceptedPapers.length + "/" + submissions.length + " con corte " + acceptancePercentage + "%");
for (const submission of submissions) {
    const status = acceptedPapers.includes(submission.paper) ? "ACEPTADO" : "rechazado";
    console.log(" - " + paperLabel(submission.paper) + " | score " + submission.paper.score().toFixed(2) + " | " + status);
}
