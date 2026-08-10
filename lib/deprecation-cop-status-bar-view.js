const { CompositeDisposable, Disposable } = require("lumine");
const _ = require("@lumine-code/underscore-plus");
const Grim = require("@lumine-code/grim");

module.exports = class DeprecationCopStatusBarView {
  static lastLength = null;
  static toolTipDisposable = null;

  constructor() {
    this.update = this.update.bind(this);
    this.subscriptions = new CompositeDisposable();

    this.element = document.createElement("div");
    this.element.classList.add("deprecation-cop-status", "text-warning");
    this.element.setAttribute("tabindex", -1);

    this.icon = document.createElement("span");
    this.icon.classList.add("icon", "icon-alert");
    this.element.appendChild(this.icon);

    this.deprecationNumber = document.createElement("span");
    this.deprecationNumber.classList.add("deprecation-number");
    this.deprecationNumber.textContent = "0";
    this.element.appendChild(this.deprecationNumber);

    const clickHandler = function () {
      const workspaceElement = lumine.views.getView(lumine.workspace);
      lumine.commands.dispatch(workspaceElement, "deprecation-cop:view");
    };
    this.element.addEventListener("click", clickHandler);
    this.subscriptions.add(
      new Disposable(() => this.element.removeEventListener("click", clickHandler)),
    );

    this.update();

    this.subscriptions.add(Grim.on("updated", this.update));
  }

  destroy() {
    this.subscriptions.dispose();
    this.element.remove();
  }

  getDeprecatedCallCount() {
    return Grim.getDeprecations()
      .map((d) => d.getStackCount())
      .reduce((a, b) => a + b, 0);
  }

  update() {
    const length = this.getDeprecatedCallCount();

    if (this.lastLength === length) {
      return;
    }

    this.lastLength = length;
    this.deprecationNumber.textContent = `${_.pluralize(length, "deprecation")}`;
    this.toolTipDisposable?.dispose();
    this.toolTipDisposable = lumine.tooltips.add(this.element, {
      title: `${_.pluralize(length, "call")} to deprecated methods`,
    });

    if (length === 0) {
      return (this.element.style.display = "none");
    } else {
      return (this.element.style.display = "");
    }
  }
};
