const Grim = require("@lumine-code/grim");
const path = require("path");

describe("DeprecationCopView", () => {
  let [deprecationCopView, workspaceElement] = [];

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);

    jasmine.snapshotDeprecations();
    Grim.clearDeprecations();
    const deprecatedMethod = () => Grim.deprecate("A test deprecation. This isn't used");
    deprecatedMethod();

    spyOn(Grim, "deprecate"); // Don't fail tests if when using deprecated APIs in deprecation cop's activation
    const activationPromise = atom.packages.activatePackage("deprecation-cop");

    atom.commands.dispatch(workspaceElement, "deprecation-cop:view");

    waitsForPromise(() => activationPromise);

    waitsFor(() => (deprecationCopView = atom.workspace.getActivePane().getActiveItem()));

    runs(() => jasmine.unspy(Grim, "deprecate"));
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
          "/Users/user/.atom/packages/package1/node_modules/atom-space-pen-viewslib/space-pen.js:55:66",
        ),
        fileName: path.normalize(
          "/Users/user/.atom/packages/package1/node_modules/atom-space-pen-views/lib/space-pen.js",
        ),
      },
      {
        functionName: "function1",
        location: path.normalize(
          "/Users/user/.atom/packages/package1/node_modules/atom-space-pen-viewslib/space-pen.js:15:16",
        ),
        fileName: path.normalize(
          "/Users/user/.atom/packages/package1/node_modules/atom-space-pen-views/lib/space-pen.js",
        ),
      },
      {
        functionName: "function2",
        location: path.normalize("/Users/user/.atom/packages/package2/lib/module.js:13:14"),
        fileName: path.normalize("/Users/user/.atom/packages/package2/lib/module.js"),
      },
    ];

    const packagePathsByPackageName = new Map([
      ["package1", path.normalize("/Users/user/.atom/packages/package1")],
      ["package2", path.normalize("/Users/user/.atom/packages/package2")],
    ]);

    spyOn(deprecationCopView, "getPackagePathsByPackageName").andReturn(packagePathsByPackageName);

    const packageName = deprecationCopView.getPackageName(stack);
    expect(packageName).toBe("package2");
  });
});
