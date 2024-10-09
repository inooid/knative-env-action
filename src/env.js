const fs = require('node:fs/promises')
const dotenv = require('dotenv')

/**
 * @param {string} filePath
 * @returns {object}
 */
async function parse(filePath) {
  const file = await fs.readFile(filePath, { encoding: 'utf8' })

  return dotenv.parse(file)
}

module.exports = {
  parse
}
