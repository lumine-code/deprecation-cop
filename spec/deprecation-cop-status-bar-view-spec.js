const Grim = require("@lumine-code/grim");

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
    // Package unload evicts the package's module tree. Resolve the constructor
    // from the active generation instead of retaining the pre-activation one.
    const DeprecationCopView = require("../lib/deprecation-cop-view");
    expect(lumine.workspace.getActivePane().getActiveItem()).not.toExist();

    await new Promise((done) => {
      lumine.workspace.onDidOpen(function ({ item }) {
        expect(item instanceof DeprecationCopView).toBe(true);
        done();
      });
      statusBarView.click();
    });
  });

  it("removes the real tooltip registration when the package deactivates", async () => {
    const element = statusBarView;
    expect(lumine.tooltips.findTooltips(element).length).toBe(1);
    await lumine.packages.deactivatePackage("deprecation-cop");
    expect(lumine.tooltips.findTooltips(element)).toEqual([]);
    expect(element.isConnected).toBe(false);
  });

  it("removes the tooltip when its status-bar service edge is disposed", async () => {
    const main = lumine.packages.getActivePackage("deprecation-cop").mainModule;
    const StatusBarView =
      lumine.packages.getActivePackage("status-bar").mainModule.statusBar.constructor;
    const bar = new StatusBarView();
    const hub = new lumine.packages.serviceHub.constructor();
    const consumer = hub.consume("status-bar", "^1.0.0", (provider) =>
      main.consumeStatusBar(provider),
    );
    const provider = hub.provide("status-bar", "1.0.0", bar);
    await Promise.resolve();
    await Promise.resolve();
    const element = bar.getRightTiles()[0].getItem().element;
    expect(lumine.tooltips.findTooltips(element).length).toBe(1);
    provider.dispose();
    expect(bar.getRightTiles().length).toBe(0);
    expect(lumine.tooltips.findTooltips(element)).toEqual([]);
    consumer.dispose();
    bar.destroy();
  });

  it("does not re-register a tooltip after a destroyed view receives an update", async () => {
    const StatusView = require("../lib/deprecation-cop-status-bar-view");
    const view = new StatusView();
    await Promise.resolve();
    view.destroy();
    view.lastLength = null;
    view.update();
    expect(lumine.tooltips.findTooltips(view.element)).toEqual([]);
    view.toolTipDisposable?.dispose();
  });

  it("does not register a tooltip if destroyed before its deferred initialization", async () => {
    const StatusView = require("../lib/deprecation-cop-status-bar-view");
    const view = new StatusView();
    view.destroy();
    await Promise.resolve();
    expect(lumine.tooltips.findTooltips(view.element)).toEqual([]);
  });
});
