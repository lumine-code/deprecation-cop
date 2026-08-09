const DeprecationCopView = require("../lib/deprecation-cop-view");

describe("DeprecationCop", () => {
  let [activationPromise, workspaceElement] = [];

  beforeEach(() => {
    workspaceElement = lumine.views.getView(lumine.workspace);
    activationPromise = lumine.packages.activatePackage("deprecation-cop");
    expect(lumine.workspace.getActivePane().getActiveItem()).not.toExist();
  });

  describe("when the deprecation-cop:view event is triggered", () =>
    it("displays the deprecation cop pane", () => {
      lumine.commands.dispatch(workspaceElement, "deprecation-cop:view");

      waitsForPromise(() => activationPromise);

      let deprecationCopView = null;
      waitsFor(() => (deprecationCopView = lumine.workspace.getActivePane().getActiveItem()));

      runs(() => expect(deprecationCopView instanceof DeprecationCopView).toBeTruthy());
    }));

  describe("deactivating the package", () =>
    it("removes the deprecation cop pane item", () => {
      lumine.commands.dispatch(workspaceElement, "deprecation-cop:view");

      waitsForPromise(() => activationPromise);

      waitsForPromise(() => Promise.resolve(lumine.packages.deactivatePackage("deprecation-cop"))); // Wrapped for Promise & non-Promise deactivate

      runs(() => expect(lumine.workspace.getActivePane().getActiveItem()).not.toExist());
    }));
});
