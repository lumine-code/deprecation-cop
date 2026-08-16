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
    if (DeprecationCopStatusBarView == null) {
      DeprecationCopStatusBarView = require("./deprecation-cop-status-bar-view");
    }
    const statusBarView = new DeprecationCopStatusBarView();
    // Warnings band, see packages/status-bar/README.md.
    const statusBarTile = statusBar.addRightTile({
      item: statusBarView,
      priority: 710,
    });
    this.disposables.add(
      new Disposable(() => {
        statusBarView.destroy();
      }),
    );
    this.disposables.add(
      new Disposable(() => {
        statusBarTile.destroy();
      }),
    );
  }
}

module.exports = new DeprecationCopPackage();
