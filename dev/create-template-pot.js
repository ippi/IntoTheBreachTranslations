'use strict'

const fs = require('fs')
const shared = require(__dirname + '/shared')

const valuesGrouped = {}
shared.translationFiles.forEach(function (translationFile) {
  const filedata = fs.readFileSync(shared.config.gamesrc + '/' + translationFile).toString()
  const lines = filedata.split('\n')
  let context = null
  let newContext = null
  let isComment = false
  const values = {}
  lines.forEach(function (line) {
    line = line.trim()
    newContext = shared.getLineContext(line, context)
    let isInvalid = line.substr(0, 2) === '--' || line.length === 0 || context === null || newContext === null
    if (line.substr(0, 4) === '--[[') {
      isComment = true
    }
    if (line.substr(0, 4) === ']]--') {
      isComment = false
      return
    }
    if (isComment) {
      isInvalid = true
    }
    context = newContext
    if (isInvalid) {
      return
    }
    if (translationFile === 'scripts/text.lua' || translationFile === 'scripts/text_achievements.lua' || translationFile === 'scripts/text_weapons.lua') {
      let m = line.match(/^(.*?) = "(.*?)",($|[\s]*--)/i)
      values[m[1]] = m[2]
    }
    if (translationFile === 'scripts/text_tooltips.lua') {
      context = shared.getLineContext(line, context)
      if (context === 'PilotSkills') {
        let m = line.match(/^(.*?) = PilotSkill\((.*?)\),/i)
        let o = JSON.parse('[' + m[2] + ']')
        for (let i in o) {
          values[context + '__' + m[1] + '_' + i] = o[i]
        }
      } else {
        let m = line.match(/^(.*?) = \{(.*?)\},($|[\s]*--)/i)
        let o = JSON.parse('[' + m[2].replace(/[\s,]*$/ig, '') + ']')
        for (let i in o) {
          values[context + '__' + m[1] + '_' + i] = o[i]
        }
      }
    }
    if (translationFile === 'scripts/text_population.lua') {
      line = line.replace(/, Odds = [0-9]+ /ig, '')
      let m = line.match(/^(.*?) = \{(.*?)\},($|[\s]*--)/i)
      let o = JSON.parse('[' + m[2].replace(/[\s,]*$/ig, '') + ']')
      for (let i in o) {
        values[m[1] + '_' + i] = o[i]
      }
    }
  })
  for (let k in values) {
    let v = values[k]
    if (v === '') {
      v = '{EMPTY}'
    }
    if (typeof valuesGrouped[v] === 'undefined') {
      valuesGrouped[v] = []
    }
    valuesGrouped[v].push(translationFile + '_' + k)
  }
})

// handle additional translations
for (let file in shared.additionalTranslationFiles) {
  let fileData = fs.readFileSync(shared.config.gamesrc + '/' + file).toString().replace(/\r/g, '')
  let lines = fileData.split('\n')
  let translationLines = shared.additionalTranslationFiles[file]
  for (let id in translationLines) {
    let data = translationLines[id]
    let text = data.text
    data.lines.forEach(function (lineNr) {
      if (!lines[lineNr - 1].match(new RegExp(shared.escapeRegex(text)))) {
        throw 'Error - Could not find translation text \'' + text + '\' in original file \'' + file + ':' + lineNr + '\''
      }
    })

    if (typeof valuesGrouped[text] === 'undefined') {
      valuesGrouped[text] = []
    }
    valuesGrouped[text].push(file + '#' + id)
  }
}

const text = ['msgid ""', 'msgstr ""']
for (let msgid in valuesGrouped) {
  text.push('msgctxt "' + valuesGrouped[msgid].join(',') + '"')
  msgid = msgid.replace(/\n/g, '\\n')
  text.push('msgid "' + msgid + '"')
  text.push('msgstr "' + msgid + '"')
}
fs.writeFileSync(__dirname + '/../languages/template.pot', new Buffer(text.join('\n')).toString())
