export async function renderPromptTemplate(runtime, templatePath, vars) {
  const template = await runtime.fs.readFile(templatePath, 'utf8')
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key) => vars[key] ?? '')
}
