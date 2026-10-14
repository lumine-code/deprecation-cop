const { Disposable, CompositeDisposable } = require("lumine");

let DeprecationCopView = null;
let DeprecationCopStatusBarView = null;
const ViewURI = "lumine://deprecation-cop";

class DeprecationCopPackage {
  activate() {
    this.disposables = new CompositeDisposable();
    this.statusBarConnections = new Map();
    this.disposables.add(
      lumine.workspace.addOpener((uri) => {
        if (uri === ViewURI) {
          return this.deserializeDeprecationCopView({ uri });
        }
      }),
    );
    this.disposables.add(
      lumine.commands.add("lumine-workspace", "deprecation-cop:view", () => {
        lumine.workspace.open(ViewURI);
      }),
    );
  }

  deactivate() {
    const owner = this.disposables;
    const connections = this.statusBarConnections;
    const items = lumine.workspace.getPaneItems().filter((item) => item.getURI?.() === ViewURI);
    this.disposables = null;
    this.statusBarConnections = null;
    connections?.clear();
    owner?.dispose();
    return Promise.all(
      items.map((item) => lumine.workspace.paneForItem(item)?.destroyItem(item, true)),
    );
  }

  deserializeDeprecationCopView(state) {
    require("@lumine-code/etch").setScheduler(lumine.views);
    if (DeprecationCopView == null) DeprecationCopView = require("./deprecation-cop-view");
    return new DeprecationCopView(state);
  }

  consumeStatusBar(service) {
    return service.observeWindows((scopedStatusBar, context) =>
      this.consumeWindowStatusBar(scopedStatusBar, context),
    );
  }

  consumeWindowStatusBar(statusBar, _context) {
    const owner = this.disposables;
    const connections = this.statusBarConnections;
    if (!owner || !connections) return new Disposable();
    let record = connections.get(statusBar);
    if (!record) {
      record = { refs: 0, disposed: false, view: null, tile: null };
      connections.set(statusBar, record);
      const retire = () => {
        if (record.disposed) return;
        record.disposed = true;
        if (connections.get(statusBar) === record) connections.delete(statusBar);
        owner.remove(record.cleanup);
        const { view, tile } = record;
        record.view = null;
        record.tile = null;
        view?.destroy();
        tile?.destroy();
      };
      record.cleanup = new Disposable(retire);
      owner.add(record.cleanup);
      const owns = () =>
        !record.disposed &&
        this.disposables === owner &&
        this.statusBarConnections === connections &&
        connections.get(statusBar) === record;

      // Keep the optional Grim scan and attachment outside the activation batch.
      queueMicrotask(() => {
        if (!owns()) return;
        if (DeprecationCopStatusBarView == null) {
          DeprecationCopStatusBarView = require("./deprecation-cop-status-bar-view");
        }
        const view = new DeprecationCopStatusBarView();
        let tile;
        let committed = false;
        try {
          if (!owns()) return;
          tile = statusBar.addRightTile({ item: view, priority: 710 });
          if (!owns()) return;
          record.view = view;
          record.tile = tile;
          committed = true;
        } finally {
          if (!committed) {
            view.destroy();
            tile?.destroy();
          }
        }
      });
    }
    record.refs += 1;
    return new Disposable(() => {
      if (record.disposed) return;
      record.refs -= 1;
      if (record.refs === 0) record.cleanup.dispose();
    });
  }
}

module.exports = new DeprecationCopPackage();
