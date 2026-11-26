// Read-only. Run through the Figma MCP connector's `use_figma` tool against the design system file.
// Returns every local variable collection and variable (names, modes, values per mode with aliases
// kept as aliases, descriptions, scopes) and every local text style with the variables its family
// and size are bound to. Save the returned JSON to a file and feed it to scripts/figma-to-dtcg.mjs.
// This script never mutates the file.
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const styles = await figma.getLocalTextStylesAsync();
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
  textStyles: styles.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    fontName: s.fontName,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    textCase: s.textCase,
    textDecoration: s.textDecoration,
    boundVariables: s.boundVariables,
  })),
};
