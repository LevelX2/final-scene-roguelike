import { createTestApiMutators } from './application/test-api-mutators.mjs';
import { createTestApiSnapshots } from './application/test-api-snapshots.mjs';

export function createTestApi(context) {
  function isTestApiEnabled() {
    try {
      return window.localStorage.getItem("dungeon-rogue-enable-test-api") === "1";
    } catch {
      return false;
    }
  }

  function syncTestApi() {
    if (!isTestApiEnabled()) {
      delete window.__TEST_API__;
      return;
    }

    window.__TEST_API__ = {
      ...createTestApiSnapshots(context),
      ...createTestApiMutators(context),
    };
  }

  return { syncTestApi };
}
