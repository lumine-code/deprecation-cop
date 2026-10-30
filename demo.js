// Authentic package usage. Run with lumine/script/demo.js; fixtures stay in demo/.
module.exports = {
  version: 1,
  dependencies: [],
  viewport: { width: 1100, height: 520 },
  async before() {},
  async prepare(context) {
    const fs = require("node:fs");
    const path = require("node:path");
    const { lumine, state, open, fixture } = context;
    state.editor = await open("signal-demo/lib/main.js");
    const dependencyDirectory = fixture("signal-demo/node_modules/@lumine-code");
    fs.mkdirSync(dependencyDirectory, { recursive: true });
    fs.symlinkSync(
      path.dirname(require.resolve("@lumine-code/grim/package.json")),
      path.join(dependencyDirectory, "grim"),
      process.platform === "win32" ? "junction" : "dir",
    );
    state.samplePackage = await lumine.packages.activatePackage(fixture("signal-demo"));
    if (state.samplePackage.mainModule.mean !== 0.375)
      throw new Error("The sample package did not execute its legacy averaging API.");
  },
  scenes: [
    {
      id: "scene-1",
      file: "demo.png",
      caption: "Inspect a deprecated API call and the package code that made it.",
      timeout: 60000,
      async run(context) {
        const { lumine, state, command, waitFor } = context;
        command("deprecation-cop:view", lumine.views.getView(state.editor));
        await waitFor(
          () => lumine.workspace.getActivePaneItem()?.getURI?.() === "lumine://deprecation-cop",
          "deprecation report",
        );
        state.report = lumine.workspace.getActivePaneItem();
        await waitFor(
          () => state.report.element.querySelector('[data-package-name="signal-analysis-demo"]'),
          "recorded sample package call",
        );
        state.report.element
          .querySelector('[data-package-name="signal-analysis-demo"] .deprecation-info')
          .click();
      },
      ready({ state }) {
        const entry = state.report?.element.querySelector(
          '[data-package-name="signal-analysis-demo"]',
        );
        return Boolean(
          entry &&
          !entry.classList.contains("collapsed") &&
          entry.querySelector(".deprecation-message")?.textContent.includes("legacyAverage()") &&
          entry.querySelector(".stack-line-location")?.textContent.includes("signal-demo") &&
          state.report.element.dataset.scrollbarKind === "panel",
        );
      },
    },
  ],
  async cleanup({ lumine, state }) {
    if (state.samplePackage) await lumine.packages.unloadPackage(state.samplePackage.name);
  },
};
