const Grim = require("@lumine-code/grim");

function summarizeSamples(samples) {
  return { mean: samples.reduce((sum, value) => sum + value, 0) / samples.length };
}

function legacyAverage(samples) {
  Grim.deprecate("legacyAverage() is deprecated. Use summarizeSamples().mean instead.");
  return summarizeSamples(samples).mean;
}

module.exports = {
  activate() {
    this.finished = new Promise((resolve) => {
      this.pending = setImmediate(() => {
        this.pending = null;
        this.mean = legacyAverage([0.2, 0.8, -0.5, 1.0]);
        resolve();
      });
    });
  },
  deactivate() {
    if (this.pending) clearImmediate(this.pending);
  },
};
