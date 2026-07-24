const fs = require('fs')
const sql = fs.readFileSync('src/routes/admin.js', 'utf8')

// Get the full INSERT block (multi-line)
const startIdx = sql.indexOf('INSERT INTO orders (id, order_no, route')
const endIdx = sql.indexOf('VALUES (', startIdx)
// Find the end of the prepared insert (last ` before .run)
let blockEnd = sql.indexOf('?)`', endIdx) + 3
const block = sql.substring(startIdx, blockEnd)

// Count columns: 
const colsPart = block.substring(block.indexOf('(') + 1, block.indexOf(') VALUES'))
const cols = colsPart.split(',').map(c => c.trim()).filter(c => c.length > 0)
console.log('Columns count:', cols.length)

// Count placeholder ?
const valsStart = block.indexOf('VALUES (') + 8
const valsPart = block.substring(valsStart)
const qCount = (valsPart.match(/\?/g) || []).length
console.log('Placeholders count:', qCount)
console.log('VALUES raw (first 100):', valsPart.substring(0, 100))
