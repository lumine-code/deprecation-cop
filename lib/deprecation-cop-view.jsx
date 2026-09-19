/** @jsx etch.dom */
const _ = require("@lumine-code/underscore-plus");
const { CompositeDisposable } = require("lumine");
const etch = require("@lumine-code/etch");
const fs = require("@lumine-code/fs-plus");
const Grim = require("@lumine-code/grim");
const path = require("path");

module.exports = class DeprecationCopView {
  constructor({ uri }) {
    this.uri = uri;
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      Grim.on("updated", () => {
        etch.update(this);
      }),
    );
    etch.initialize(this);
    this.subscriptions.add(
      lumine.commands.add(this.element, {
        "core:move-up": () => {
          this.scrollUp();
        },
        "core:move-down": () => {
          this.scrollDown();
        },
        "core:page-up": () => {
          this.pageUp();
        },
        "core:page-down": () => {
          this.pageDown();
        },
        "core:move-to-top": () => {
          this.scrollToTop();
        },
        "core:move-to-bottom": () => {
          this.scrollToBottom();
        },
      }),
    );
  }

  serialize() {
    return {
      deserializer: this.constructor.name,
      uri: this.getURI(),
      version: 1,
    };
  }

  destroy() {
    this.subscriptions.dispose();
    return etch.destroy(this);
  }

  update() {
    return etch.update(this);
  }

  render() {
    return (
      <div className="deprecation-cop pane-item native-key-bindings" tabIndex="-1">
        <div className="panel">
          <div className="padded deprecation-overview">
            <div className="pull-right btn-group">
              <button
                className="btn btn-primary check-for-update"
                onclick={(event) => {
                  event.preventDefault();
                  this.checkForUpdates();
                }}
              >
                Check for Updates
              </button>
            </div>
          </div>

          <div className="panel-heading">
            <span>Deprecated calls</span>
          </div>
          <ul className="list-tree has-collapsable-children">{this.renderDeprecatedCalls()}</ul>
        </div>
      </div>
    );
  }

  renderDeprecatedCalls() {
    const deprecationsByPackageName = this.getDeprecatedCallsByPackageName();
    const packageNames = Object.keys(deprecationsByPackageName);
    if (packageNames.length === 0) {
      return <li className="list-item">No deprecated calls</li>;
    } else {
      //TODO_LUMINE: Validate 'lumine core'
      return packageNames.sort().map((packageName) => (
        <li className="deprecation list-nested-item collapsed">
          <div
            className="deprecation-info list-item"
            onclick={(event) => event.target.parentElement.classList.toggle("collapsed")}
          >
            <span className="text-highlight">{packageName || "lumine core"}</span>
            <span>{` (${_.pluralize(
              deprecationsByPackageName[packageName].length,
              "deprecation",
            )})`}</span>
          </div>

          <ul className="list">
            {this.renderPackageActionsIfNeeded(packageName)}
            {deprecationsByPackageName[packageName].map(({ deprecation, stack }) => (
              <li className="list-item deprecation-detail">
                <span className="text-warning icon icon-alert" />
                <div
                  className="list-item deprecation-message"
                  innerHTML={lumine.tools.markdown.render(deprecation.getMessage())}
                />
                {this.renderIssueActionsIfNeeded(packageName, deprecation, stack)}
                <div className="stack-trace">
                  {stack.map(({ functionName, location }) => (
                    <div className="stack-line">
                      <span>{functionName}</span>
                      <span> - </span>
                      <a
                        className="stack-line-location"
                        href={location}
                        onclick={(event) => {
                          event.preventDefault();
                          this.openLocation(location);
                        }}
                      >
                        {location}
                      </a>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </li>
      ));
    }
  }

  renderPackageActionsIfNeeded(packageName) {
    if (packageName && lumine.packages.getLoadedPackage(packageName)) {
      return (
        <div className="padded">
          <div className="btn-group">
            <button
              className="btn check-for-update"
              onclick={(event) => {
                event.preventDefault();
                this.checkForUpdates();
              }}
            >
              Check for Update
            </button>
            <button
              className="btn disable-package"
              data-package-name={packageName}
              onclick={(event) => {
                event.preventDefault();
                this.disablePackage(packageName);
              }}
            >
              Disable Package
            </button>
          </div>
        </div>
      );
    } else {
      return "";
    }
  }

  renderIssueActionsIfNeeded(packageName, deprecation, stack) {
    if (packageName) {
      const repoURL = this.getRepoURL(packageName);
      const issueTitle = `${deprecation.getOriginName()} is deprecated.`;
      const issueURL = this.buildIssueURL(repoURL, issueTitle);
      const issueReport = this.buildIssueReport(deprecation, stack);
      if (!issueURL) return "";
      return (
        <div className="btn-toolbar">
          <button
            className="btn issue-url"
            data-issue-title={issueTitle}
            data-repo-url={repoURL}
            data-issue-url={issueURL}
            onclick={(event) => {
              event.preventDefault();
              this.openIssueURL(repoURL, issueURL, issueTitle);
            }}
          >
            Open Issue
          </button>
          <button
            className="btn icon icon-clippy copy-issue-report"
            title="Copy deprecation report to clipboard"
            aria-label="Copy deprecation report to clipboard"
            onclick={(event) => {
              event.preventDefault();
              this.copyIssueReport(issueReport);
            }}
          />
        </div>
      );
    } else {
      return "";
    }
  }

  buildIssueURL(repoURL, issueTitle) {
    if (!repoURL) return null;
    const issueURL = new URL(`${repoURL.replace(/\/$/, "")}/issues/new`);
    issueURL.searchParams.set("title", issueTitle);
    issueURL.searchParams.set(
      "body",
      "<!-- Copy the deprecation report from Lumine and paste it here. -->",
    );
    return issueURL.href;
  }

  buildIssueReport(deprecation, stack) {
    const stacktrace = stack
      .map(({ functionName, location }) => `${functionName} (${location})`)
      .join("\n");
    return `${deprecation.getMessage()}\n\`\`\`\n${stacktrace}\n\`\`\``;
  }

  async copyIssueReport(issueReport) {
    try {
      await lumine.clipboard.write(issueReport);
      lumine.notifications.addSuccess("Deprecation report copied to the clipboard.");
    } catch (error) {
      lumine.notifications.addWarning("Unable to copy the deprecation report.", {
        detail: error.message,
        dismissable: true,
      });
    }
  }

  async openIssueURL(repoURL, issueURL, issueTitle) {
    const issue = await this.findSimilarIssue(repoURL, issueTitle);
    try {
      await lumine.shell.openExternal(issue ? issue.html_url : issueURL);
    } catch (error) {
      lumine.notifications.addWarning("Unable to open the issue page.", {
        detail: error.message,
        dismissable: true,
      });
    }
  }

  async findSimilarIssue(repoURL, issueTitle) {
    try {
      const url = "https://api.github.com/search/issues";
      const repo = repoURL.replace(/http(s)?:\/\/(\d+\.)?github.com\//gi, "");
      const query = `${issueTitle} repo:${repo}`;
      const response = await window.fetch(`${url}?q=${encodeURI(query)}&sort=created`, {
        method: "GET",
        headers: {
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          const issues = {};
          for (const issue of data.items) {
            if (issue.title.includes(issueTitle) && !issues[issue.state]) {
              issues[issue.state] = issue;
            }
          }

          return issues.open || issues.closed;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  getRepoURL(packageName) {
    const loadedPackage = lumine.packages.getLoadedPackage(packageName);
    if (loadedPackage && loadedPackage.metadata && loadedPackage.metadata.repository) {
      const url = loadedPackage.metadata.repository.url || loadedPackage.metadata.repository;
      return url.replace(/\.git$/, "");
    } else {
      return null;
    }
  }

  getDeprecatedCallsByPackageName() {
    const deprecatedCalls = Grim.getDeprecations();
    deprecatedCalls.sort((a, b) => b.getCallCount() - a.getCallCount());
    const deprecatedCallsByPackageName = {};
    for (const deprecation of deprecatedCalls) {
      const stacks = deprecation.getStacks();
      stacks.sort((a, b) => b.callCount - a.callCount);
      for (const stack of stacks) {
        let packageName;
        if (stack.metadata && stack.metadata.packageName) {
          packageName = stack.metadata.packageName;
        } else {
          packageName = (this.getPackageName(stack) || "").toLowerCase();
        }

        deprecatedCallsByPackageName[packageName] = deprecatedCallsByPackageName[packageName] || [];
        deprecatedCallsByPackageName[packageName].push({ deprecation, stack });
      }
    }
    return deprecatedCallsByPackageName;
  }

  getPackageName(stack) {
    // Stack frames report the real path of a symlinked package, so match
    // against that for anything installed under a package directory.
    const packageDirPaths = lumine.packages
      .getPackageDirPaths()
      .map((packageDirPath) => path.normalize(packageDirPath + path.sep));
    const packagePaths = this.getPackagePathsByPackageName();
    for (const [packageName, packagePath] of packagePaths) {
      if (packageDirPaths.some((packageDirPath) => packagePath.startsWith(packageDirPath))) {
        packagePaths.set(packageName, fs.absolute(packagePath));
      }
    }

    for (let i = 1; i < stack.length; i++) {
      const { fileName } = stack[i];

      // Empty when it was run from the dev console
      if (!fileName) {
        return null;
      }

      // Continue to next stack entry if call is in node_modules
      if (fileName.includes(`${path.sep}node_modules${path.sep}`)) {
        continue;
      }

      for (const [packageName, packagePath] of packagePaths) {
        const relativePath = path.relative(packagePath, fileName);
        if (!/^\.\./.test(relativePath)) {
          return packageName;
        }
      }

      if (lumine.getUserInitScriptPath() === fileName) {
        return `Your local ${path.basename(fileName)} file`;
      }
    }

    return null;
  }

  getPackagePathsByPackageName() {
    if (this.packagePathsByPackageName) {
      return this.packagePathsByPackageName;
    } else {
      this.packagePathsByPackageName = new Map();
      for (const pack of lumine.packages.getLoadedPackages()) {
        this.packagePathsByPackageName.set(pack.name, pack.path);
      }
      return this.packagePathsByPackageName;
    }
  }

  checkForUpdates() {
    lumine.workspace.open("lumine://config/updates");
  }

  disablePackage(packageName) {
    if (packageName) {
      lumine.packages.disablePackage(packageName);
    }
  }

  openLocation(location) {
    let pathToOpen = location.replace("file://", "");
    if (process.platform === "win32") {
      pathToOpen = pathToOpen.replace(/^\//, "");
    }
    lumine.application.openWindow({ pathsToOpen: [pathToOpen] });
  }

  getURI() {
    return this.uri;
  }

  getTitle() {
    return "Deprecation Cop";
  }

  getIconName() {
    return "alert";
  }

  scrollUp() {
    this.element.scrollTop -= document.body.offsetHeight / 20;
  }

  scrollDown() {
    this.element.scrollTop += document.body.offsetHeight / 20;
  }

  pageUp() {
    this.element.scrollTop -= this.element.offsetHeight;
  }

  pageDown() {
    this.element.scrollTop += this.element.offsetHeight;
  }

  scrollToTop() {
    this.element.scrollTop = 0;
  }

  scrollToBottom() {
    this.element.scrollTop = this.element.scrollHeight;
  }
};
