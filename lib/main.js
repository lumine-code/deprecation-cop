const { Disposable, CompositeDisposable } = require("lumine");
const DeprecationCopView = require("./deprecation-cop-view");
const DeprecationCopStatusBarView = require("./deprecation-cop-status-bar-view");
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
    return new DeprecationCopView(state);
  }

  consumeStatusBar(statusBar) {
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
