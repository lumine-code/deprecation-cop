const DeprecationCopView = require("../lib/deprecation-cop-view");

describe("DeprecationCop", () => {
  let [activationPromise, workspaceElement] = [];

  beforeEach(() => {
    workspaceElement = lumine.views.getView(lumine.workspace);
    activationPromise = lumine.packages.activatePackage("deprecation-cop");
    expect(lumine.workspace.getActivePane().getActiveItem()).not.toExist();
  });

  describe("when the deprecation-cop:view event is triggered", () =>
    it("displays the deprecation cop pane", async () => {
      lumine.commands.dispatch(workspaceElement, "deprecation-cop:view");

      await activationPromise;

      let deprecationCopView = null;
      await conditionPromise(
        () => (deprecationCopView = lumine.workspace.getActivePane().getActiveItem()),
      );

      expect(deprecationCopView instanceof DeprecationCopView).toBeTruthy();
    }));

  describe("deactivating the package", () =>
    it("removes the deprecation cop pane item", async () => {
      lumine.commands.dispatch(workspaceElement, "deprecation-cop:view");

      await activationPromise;

      await Promise.resolve(lumine.packages.deactivatePackage("deprecation-cop")); // Wrapped for Promise & non-Promise deactivate

      expect(lumine.workspace.getActivePane().getActiveItem()).not.toExist();
    }));
});
