export function createRuntimeContext(context) {
  return {
    factories: context.factories,
    config: context.config,
    ui: context.ui,
    runtime: context.runtime,
    equipment: context.equipment,
    core: {},
    presentation: {},
    interface: {},
    gameplay: {},
  };
}
