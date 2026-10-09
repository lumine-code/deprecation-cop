const { Disposable, CompositeDisposable } = require("lumine");
const etch = require("@lumine-code/etch");

// Etch holds its scheduler per copy of the library, and this package resolves
// its own copy — so the assignment the editor makes on core's copy never
// reaches it. Point it at the view registry before anything renders, or this
// package's DOM writes land on an animation frame of their own alongside the
// editor's and force a synchronous reflow.
etch.setScheduler(lumine.views);

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
    const pane = lumine.workspace.paneForURI(ViewURI);
    const item = pane?.itemForURI(ViewURI);
    this.disposables = null;
    this.statusBarConnections = null;
    connections?.clear();
    owner?.dispose();
    if (item) pane.destroyItem(item);
  }

  deserializeDeprecationCopView(state) {
    if (DeprecationCopView == null) DeprecationCopView = require("./deprecation-cop-view");
    return new DeprecationCopView(state);
  }

  consumeStatusBar(statusBar) {
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
