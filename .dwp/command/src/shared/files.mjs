export async function ensureDir(runtime, dirPath) {
  await runtime.fs.mkdir(dirPath, { recursive: true })
}

export async function resetFile(runtime, filePath) {
  await runtime.fs.writeFile(filePath, '', 'utf8')
}

export async function readText(runtime, filePath) {
  return runtime.fs.readFile(filePath, 'utf8')
}
