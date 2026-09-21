const Grim = require("@lumine-code/grim");
const path = require("path");

describe("DeprecationCopView", () => {
  let [deprecationCopView, workspaceElement] = [];

  beforeEach(async () => {
    workspaceElement = lumine.views.getView(lumine.workspace);
    jasmine.attachToDOM(workspaceElement);

    jasmine.snapshotDeprecations();
    Grim.clearDeprecations();
    const deprecatedMethod = () => Grim.deprecate("A test deprecation. This isn't used");
    deprecatedMethod();

    spyOn(Grim, "deprecate"); // Don't fail tests if when using deprecated APIs in deprecation cop's activation
    const activationPromise = lumine.packages.activatePackage("deprecation-cop");

    lumine.commands.dispatch(workspaceElement, "deprecation-cop:view");

    await activationPromise;

    await conditionPromise(
      () => (deprecationCopView = lumine.workspace.getActivePane().getActiveItem()),
    );

    jasmine.unspy(Grim, "deprecate");
  });

  afterEach(() => jasmine.restoreDeprecationsSnapshot());

  it("displays deprecated methods", () => {
    expect(deprecationCopView.element.textContent).toMatch(/Deprecated calls/);
    expect(deprecationCopView.element.textContent).toMatch(/This isn't used/);
  });

  it("skips stack entries which go through node_modules/ files when determining package name", () => {
    const stack = [
      {
        functionName: "function0",
        location: path.normalize(
          "/Users/user/.lumine/packages/package1/node_modules/legacy-viewslib/space-pen.js:55:66",
        ),
        fileName: path.normalize(
          "/Users/user/.lumine/packages/package1/node_modules/legacy-views/lib/space-pen.js",
        ),
      },
      {
        functionName: "function1",
        location: path.normalize(
          "/Users/user/.lumine/packages/package1/node_modules/legacy-viewslib/space-pen.js:15:16",
        ),
        fileName: path.normalize(
          "/Users/user/.lumine/packages/package1/node_modules/legacy-views/lib/space-pen.js",
        ),
      },
      {
        functionName: "function2",
        location: path.normalize("/Users/user/.lumine/packages/package2/lib/module.js:13:14"),
        fileName: path.normalize("/Users/user/.lumine/packages/package2/lib/module.js"),
      },
    ];

    const packagePathsByPackageName = new Map([
      ["package1", path.normalize("/Users/user/.lumine/packages/package1")],
      ["package2", path.normalize("/Users/user/.lumine/packages/package2")],
    ]);

    spyOn(deprecationCopView, "getPackagePathsByPackageName").and.returnValue(
      packagePathsByPackageName,
    );

    const packageName = deprecationCopView.getPackageName(stack);
    expect(packageName).toBe("package2");
  });

  it("keeps the deprecation report out of the issue URL", () => {
    const deprecation = {
      getMessage: () => "A very long report " + "x".repeat(6000),
    };
    const stack = [{ functionName: "oldCall", location: "package/lib/main.js:1:1" }];
    const report = deprecationCopView.buildIssueReport(deprecation, stack);
    const issueURL = deprecationCopView.buildIssueURL(
      "https://github.com/lumine-code/example",
      "oldCall is deprecated.",
    );
    const parsed = new URL(issueURL);

    expect(report.length).toBeGreaterThan(6000);
    expect(report).toContain("package/lib/main.js:1:1");
    expect(parsed.searchParams.get("title")).toBe("oldCall is deprecated.");
    expect(parsed.searchParams.get("body")).toContain("paste it here");
    expect(issueURL.length).toBeLessThan(500);
    expect(issueURL).not.toContain("package%2Flib");
  });

  it("copies a deprecation report independently", async () => {
    spyOn(lumine.clipboard, "write").and.returnValue(Promise.resolve());
    spyOn(lumine.notifications, "addSuccess");

    await deprecationCopView.copyIssueReport("full report");

    expect(lumine.clipboard.write).toHaveBeenCalledWith("full report");
    expect(lumine.notifications.addSuccess).toHaveBeenCalledWith(
      "Deprecation report copied to the clipboard.",
    );
  });

  it("warns when a deprecation report cannot be copied", async () => {
    const error = new Error("clipboard unavailable");
    spyOn(lumine.clipboard, "write").and.returnValue(Promise.reject(error));
    spyOn(lumine.notifications, "addWarning");

    await deprecationCopView.copyIssueReport("full report");

    expect(lumine.notifications.addWarning).toHaveBeenCalledWith(
      "Unable to copy the deprecation report.",
      { detail: error.message, dismissable: true },
    );
  });

  it("opens an existing issue or the short new-issue URL", async () => {
    spyOn(lumine.shell, "openExternal").and.returnValue(Promise.resolve());
    spyOn(deprecationCopView, "findSimilarIssue").and.returnValues(
      Promise.resolve({ html_url: "https://github.com/lumine-code/example/issues/1" }),
      Promise.resolve(null),
    );
    const newIssueURL = "https://github.com/lumine-code/example/issues/new?title=deprecated";

    await deprecationCopView.openIssueURL(
      "https://github.com/lumine-code/example",
      newIssueURL,
      "deprecated",
    );
    await deprecationCopView.openIssueURL(
      "https://github.com/lumine-code/example",
      newIssueURL,
      "deprecated",
    );

    expect(lumine.shell.openExternal.calls.argsFor(0)[0]).toBe(
      "https://github.com/lumine-code/example/issues/1",
    );
    expect(lumine.shell.openExternal.calls.argsFor(1)[0]).toBe(newIssueURL);
  });

  it("treats an issue-search failure as no matching issue", async () => {
    spyOn(window, "fetch").and.returnValue(Promise.reject(new Error("offline")));

    expect(
      await deprecationCopView.findSimilarIssue(
        "https://github.com/lumine-code/example",
        "deprecated",
      ),
    ).toBeNull();
  });

  it("reports a package disable failure", async () => {
    const error = new Error("deactivation failed");
    spyOn(lumine.packages, "disablePackage").and.returnValue(Promise.reject(error));
    spyOn(lumine.notifications, "addError");

    await deprecationCopView.disablePackage("broken-package");

    expect(lumine.notifications.addError).toHaveBeenCalledWith(
      "Unable to disable broken-package.",
      { detail: error.message, dismissable: true },
    );
  });
});
