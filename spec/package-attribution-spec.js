const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

describe("Deprecation Cop live package attribution", () => {
  let view, directory, packageName;
  const stackFor = (fileName) => [{}, { fileName }];

  beforeEach(async () => {
    const main = (await lumine.packages.activatePackage("deprecation-cop")).mainModule;
    view = main.deserializeDeprecationCopView({ uri: "lumine://deprecation-cop" });
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "deprecation-cop-attribution-"));
    packageName = "deprecation-cop-attribution-fixture";
    await fs.writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ name: packageName, version: "1.0.0", engines: { lumine: "^1.0.0" } }),
    );
  });

  afterEach(async () => {
    await view.destroy();
    if (lumine.packages.getLoadedPackage(packageName)) {
      await lumine.packages.unloadPackage(packageName);
    }
    const target = path.resolve(directory);
    if (
      path.dirname(target) !== path.resolve(os.tmpdir()) ||
      !path.basename(target).startsWith("deprecation-cop-attribution-")
    ) {
      throw new Error("Unsafe attribution fixture cleanup");
    }
    await fs.rm(target, { recursive: true, force: true });
  });

  it("attributes files beginning with two dots to their real owning package", async () => {
    await lumine.packages.loadPackage(directory);
    expect(view.getPackageName(stackFor(path.join(directory, "..config.js")))).toBe(packageName);
    expect(view.getPackageName(stackFor(path.join(directory, "..", "outside.js")))).not.toBe(
      packageName,
    );
  });

  it("refreshes the path cache when a package is loaded or unloaded", async () => {
    const stack = stackFor(path.join(directory, "lib", "main.js"));
    expect(view.getPackageName(stack)).toBeNull();
    await lumine.packages.loadPackage(directory);
    expect(view.getPackageName(stack)).toBe(packageName);
    await lumine.packages.unloadPackage(packageName);
    expect(view.getPackageName(stack)).toBeNull();
  });
});
