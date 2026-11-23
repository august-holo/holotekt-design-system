// Read-only. Run through the Figma MCP connector's `use_figma` tool against the design system file.
// Returns every local variable collection and variable: names, modes, values per mode (aliases kept
// as aliases), descriptions and scopes. Save the returned JSON to a file and feed it to
// scripts/figma-to-dtcg.mjs. This script never mutates the file.
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
return {
  fileName: figma.root.name,
  readAt: new Date().toISOString(),
  collections: collections.map((c) => ({
    id: c.id,
    name: c.name,
    defaultModeId: c.defaultModeId,
    modes: c.modes.map((m) => ({ id: m.modeId, name: m.name })),
    variableIds: c.variableIds,
  })),
  variables: variables.map((v) => ({
    id: v.id,
    name: v.name,
    collectionId: v.variableCollectionId,
    resolvedType: v.resolvedType,
    description: v.description,
    scopes: v.scopes,
    valuesByMode: v.valuesByMode,
  })),
};
