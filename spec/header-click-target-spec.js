const Grim = require("@lumine-code/grim");

describe("Deprecation Cop rendered group header clicks", () => {
  let view, group, header;

  beforeEach(async () => {
    for (const method of ["openExternal", "openPath", "showItemInFolder", "openApplication"])
      if (!jasmine.isSpy(lumine.shell[method])) spyOn(lumine.shell, method).and.resolveTo();
    if (!jasmine.isSpy(lumine.application.openWindow))
      spyOn(lumine.application, "openWindow").and.resolveTo();
    spyOn(window, "fetch").and.rejectWith(new Error("No network in this fixture"));
    jasmine.snapshotDeprecations();
    Grim.clearDeprecations();
    if (lumine.packages.isPackageLoaded("deprecation-cop"))
      await lumine.packages.unloadPackage("deprecation-cop");
    await lumine.packages.activatePackage("deprecation-cop");
    Grim.deprecate("Owned clickable deprecation", { packageName: "deprecation-cop" });
    jasmine.attachToDOM(lumine.workspace.getElement());
    lumine.commands.dispatch(lumine.workspace.getElement(), "deprecation-cop:view");
    await conditionPromise(() => {
      view = lumine.workspace.getActivePaneItem();
      return view?.getURI?.() === "lumine://deprecation-cop";
    });
    group = view.element.querySelector(".deprecation.list-nested-item");
    header = group.querySelector(".deprecation-info");
    expect(group.classList.contains("collapsed")).toBe(true);
    expect(group.querySelector(".deprecation-detail").offsetHeight).toBe(0);
  });

  afterEach(async () => {
    if (lumine.packages.isPackageLoaded("deprecation-cop"))
      await lumine.packages.unloadPackage("deprecation-cop");
    jasmine.restoreDeprecationsSnapshot();
    view = group = header = null;
  });

  for (const [label, selector] of [
    ["package name", ".text-highlight"],
    ["count", "span:last-child"],
  ])
    it(`expands and collapses the actual group when its ${label} is clicked`, () => {
      header.querySelector(selector).click();
      expect(group.classList.contains("collapsed")).toBe(false);
      expect(group.querySelector(".deprecation-detail").offsetHeight).toBeGreaterThan(0);
      header.querySelector(selector).click();
      expect(group.classList.contains("collapsed")).toBe(true);
      expect(group.querySelector(".deprecation-detail").offsetHeight).toBe(0);
    });

  it("keeps ordinary direct header clicks working", () => {
    header.click();
    expect(group.classList.contains("collapsed")).toBe(false);
    expect(group.querySelector(".deprecation-detail").offsetHeight).toBeGreaterThan(0);
    header.click();
    expect(group.classList.contains("collapsed")).toBe(true);
  });
});
