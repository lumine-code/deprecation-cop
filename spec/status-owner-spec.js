describe("Deprecation Cop exact status payload ownership", () => {
  let main, hub, consumer, bars, providers, StatusBarView;
  const tiles = (bar) =>
    bar
      .getRightTiles()
      .filter((tile) => tile.getItem().element?.matches(".deprecation-cop-status"));
  const settle = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(async () => {
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage("status-bar");
    StatusBarView = lumine.packages.getActivePackage("status-bar").mainModule.statusBar.constructor;
    main = (await lumine.packages.activatePackage("deprecation-cop")).mainModule;
    hub = new lumine.packages.serviceHub.constructor();
    consumer = hub.consume("status-bar", "^1.0.0", (bar) => main.consumeStatusBar(bar));
    bars = [];
    providers = [];
  });

  afterEach(async () => {
    consumer.dispose();
    for (const provider of providers) provider.dispose();
    await lumine.packages.deactivatePackage("deprecation-cop");
    for (const bar of bars) bar.destroy();
  });

  function provide(bar) {
    if (!bar) {
      bar = new StatusBarView();
      bars.push(bar);
      jasmine.attachToDOM(bar.element);
    }
    const provider = hub.provide("status-bar", "1.0.0", bar);
    providers.push(provider);
    return { bar, provider };
  }

  it("shares a tile and tooltip until the final exact-payload lease ends", async () => {
    const first = provide(),
      second = provide(first.bar);
    await settle();
    expect(tiles(first.bar).length).toBe(1);
    const element = tiles(first.bar)[0].getItem().element;
    first.provider.dispose();
    expect(tiles(first.bar).length).toBe(1);
    expect(lumine.tooltips.findTooltips(element).length).toBe(1);
    second.provider.dispose();
    expect(tiles(first.bar).length).toBe(0);
    expect(lumine.tooltips.findTooltips(element)).toEqual([]);
  });

  it("keeps distinct payload tiles separate without disposing either borrowed bar", async () => {
    const first = provide(),
      second = provide();
    const firstDestroy = spyOn(first.bar, "destroy").and.callThrough();
    const secondDestroy = spyOn(second.bar, "destroy").and.callThrough();
    await settle();
    first.provider.dispose();
    expect(tiles(first.bar).length).toBe(0);
    expect(tiles(second.bar).length).toBe(1);
    expect(firstDestroy).not.toHaveBeenCalled();
    expect(secondDestroy).not.toHaveBeenCalled();
  });

  it("does not let an old lease remove a later activation's tile", async () => {
    const first = provide();
    await settle();
    await lumine.packages.deactivatePackage("deprecation-cop");
    main = (await lumine.packages.activatePackage("deprecation-cop")).mainModule;
    provide(first.bar);
    await settle();
    first.provider.dispose();
    expect(tiles(first.bar).length).toBe(1);
  });

  it("retires a tile allocated during package deactivation", async () => {
    const bar = new StatusBarView();
    bars.push(bar);
    const add = bar.addRightTile.bind(bar);
    spyOn(bar, "addRightTile").and.callFake((options) => {
      const tile = add(options);
      main.deactivate();
      return tile;
    });
    provide(bar);
    await settle();
    expect(tiles(bar).length).toBe(0);
  });
});
