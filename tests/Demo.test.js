const {execFileSync} = require("child_process");

describe("The live demo script", function demoSuite() {
    it("should complete a full run and print a final conference summary", function shouldPrintSummary() {
        const output = execFileSync("node", ["demo.js"], {
            cwd: process.cwd(),
            encoding: "utf8"
        });

        expect(output).toContain("Demo en vivo de ComfyChair");
        expect(output).toContain("Session.closeSubmissions");
        expect(output).toContain("Session.closeBidding");
        expect(output).toContain("Resumen final de la conferencia");
        expect(output).toMatch(/Aceptados: \d+\/\d+/);
    });
});
