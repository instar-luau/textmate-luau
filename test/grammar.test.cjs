const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { after, test } = require("node:test");
const oniguruma = require("vscode-oniguruma");
const textmate = require("vscode-textmate");

const filename = join(__dirname, "../grammar.json");
const directory = join(__dirname, "fixtures");
const bytes = readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm"));
const registry = new textmate.Registry({
    onigLib: oniguruma
        .loadWASM(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
        .then(() => ({
            createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
            createOnigString: (text) => new oniguruma.OnigString(text),
        })),
    loadGrammar: async (scope) =>
        scope === "source.luau"
            ? textmate.parseRawGrammar(readFileSync(filename, "utf8"), filename)
            : null,
});

after(() => registry.dispose());

for (const fixture of readdirSync(directory, { recursive: true }).filter((file) =>
    file.endsWith(".luau"),
)) {
    test(fixture, async () => {
        const grammar = await registry.loadGrammar("source.luau");
        assert.ok(grammar);
        const lines = readFileSync(join(directory, fixture), "utf8").split(/\r?\n/u);
        const scopes = JSON.parse(
            readFileSync(join(directory, fixture.replace(/\.luau$/u, ".json")), "utf8"),
        );
        let state = textmate.INITIAL;
        const tokens = lines.map((line) => {
            const result = grammar.tokenizeLine(line, state);
            state = result.ruleStack;
            return result.tokens;
        });
        for (const [number, expected] of Object.entries(scopes)) {
            const index = Number(number) - 1;
            const line = lines[index];
            for (const [text, scope] of Object.entries(expected)) {
                const column = line.indexOf(text);
                const token = tokens[index].find(
                    (candidate) => candidate.startIndex <= column && column < candidate.endIndex,
                );
                assert.equal(
                    token?.scopes.at(-1),
                    scope,
                    `${fixture}:${number}: ${JSON.stringify(text)} in ${line}`,
                );
            }
        }
    });
}
