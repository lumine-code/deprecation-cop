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

  it("derives line scrolling from its current surface viewport", () => {
    const frame = document.createElement("iframe");
    jasmine.attachToDOM(frame);
    const originalParent = deprecationCopView.element.parentNode;
    const anchor = document.createComment("deprecation cop return position");
    originalParent.insertBefore(anchor, deprecationCopView.element);
    frame.contentDocument.body.appendChild(deprecationCopView.element);
    spyOnProperty(frame.contentDocument.body, "offsetHeight", "get").and.returnValue(400);
    let scrollTop = 100;
    Object.defineProperty(deprecationCopView.element, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      },
    });

    try {
      deprecationCopView.scrollDown();
      expect(scrollTop).toBe(120);
      deprecationCopView.scrollUp();
      expect(scrollTop).toBe(100);
    } finally {
      delete deprecationCopView.element.scrollTop;
      originalParent.insertBefore(deprecationCopView.element, anchor);
      anchor.remove();
      frame.remove();
    }
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
});
