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
    this.disposables.dispose();
    const pane = lumine.workspace.paneForURI(ViewURI);
    if (pane) {
      pane.destroyItem(pane.itemForURI(ViewURI));
    }
  }

  deserializeDeprecationCopView(state) {
    if (DeprecationCopView == null) DeprecationCopView = require("./deprecation-cop-view");
    return new DeprecationCopView(state);
  }

  consumeStatusBar(statusBar) {
    let disposed = false;
    let registration = null;
    const deferred = new Disposable(() => {
      disposed = true;
      registration?.dispose();
      registration = null;
    });
    this.disposables.add(deferred);

    // The Grim status view walks the deprecation stack while constructing its
    // initial state. Keep the service callback synchronous (it returns its
    // disposable immediately), but load and attach that optional UI after the
    // activation batch has yielded.
    queueMicrotask(() => {
      if (disposed) return;
      if (DeprecationCopStatusBarView == null) {
        DeprecationCopStatusBarView = require("./deprecation-cop-status-bar-view");
      }
      const statusBarView = new DeprecationCopStatusBarView();
      const statusBarTile = statusBar.addRightTile({
        item: statusBarView,
        priority: 710,
      });
      registration = new CompositeDisposable(
        new Disposable(() => statusBarView.destroy()),
        new Disposable(() => statusBarTile.destroy()),
      );
      if (disposed) registration.dispose();
      else this.disposables.add(registration);
    });
    return deferred;
  }
}

module.exports = new DeprecationCopPackage();
