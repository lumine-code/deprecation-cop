const Grim = require("@lumine-code/grim");
const DeprecationCopView = require("../lib/deprecation-cop-view");

describe("DeprecationCopStatusBarView", () => {
  let [deprecatedMethod, statusBarView, workspaceElement] = [];

  beforeEach(async () => {
    jasmine.snapshotDeprecations();

    workspaceElement = lumine.views.getView(lumine.workspace);
    jasmine.attachToDOM(workspaceElement);
    await lumine.packages.activatePackage("status-bar");
    await lumine.packages.activatePackage("deprecation-cop");

    await conditionPromise(
      () => (statusBarView = workspaceElement.querySelector(".deprecation-cop-status")),
    );
  });

  afterEach(() => jasmine.restoreDeprecationsSnapshot());

  it("adds the status bar view when activated", () => {
    expect(statusBarView).toExist();
    expect(statusBarView.textContent).toBe("0 deprecations");
    expect(statusBarView).not.toShow();
  });

  it("increments when there are deprecated methods", () => {
    deprecatedMethod = () => Grim.deprecate("This isn't used");
    const anotherDeprecatedMethod = () => Grim.deprecate("This either");
    expect(statusBarView.style.display).toBe("none");
    expect(statusBarView.offsetHeight).toBe(0);

    deprecatedMethod();
    expect(statusBarView.textContent).toBe("1 deprecation");
    expect(statusBarView.offsetHeight).toBeGreaterThan(0);

    deprecatedMethod();
    expect(statusBarView.textContent).toBe("2 deprecations");
    expect(statusBarView.offsetHeight).toBeGreaterThan(0);

    anotherDeprecatedMethod();
    expect(statusBarView.textContent).toBe("3 deprecations");
    expect(statusBarView.offsetHeight).toBeGreaterThan(0);
  });

  it("opens deprecation cop tab when clicked", async () => {
    expect(lumine.workspace.getActivePane().getActiveItem()).not.toExist();

    await new Promise((done) => {
      lumine.workspace.onDidOpen(function ({ item }) {
        expect(item instanceof DeprecationCopView).toBe(true);
        done();
      });
      statusBarView.click();
    });
  });
});
