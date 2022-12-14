import * as core from '@actions/core'

import {camelCase} from 'camel-case'
import {constantCase} from 'constant-case'
import {pascalCase} from 'pascal-case'
import {snakeCase} from 'snake-case'

let excludeList = [
  // this variable is already exported automatically
  'github_token'
]

function tf_case(s: string): string {
  if (s.startsWith('TF_VAR_')) {
    return s.substring(0, 7) + s.substring(7).toLowerCase()
  } else {
    return s
  }
}

const convertTypes: Record<string, (s: string) => string> = {
  lower: s => s.toLowerCase(),
  upper: s => s.toUpperCase(),
  camel: camelCase,
  constant: constantCase,
  pascal: pascalCase,
  snake: snakeCase,
  tf_case: s => tf_case(s)
}

async function run(): Promise<void> {
  try {
    const secretsJson: string = core.getInput('secrets', {
      required: true
    })
    const keyPrefix: string = core.getInput('prefix')
    const includeListStr: string = core.getInput('include')
    const excludeListStr: string = core.getInput('exclude')
    const convert: string = core.getInput('convert')

    let secrets: Record<string, string>
    try {
      secrets = JSON.parse(secretsJson)
    } catch (e) {
      throw new Error(`Cannot parse JSON secrets.
Make sure you add the following to this action:

with:
      secrets: \${{ toJSON(secrets) }}
`)
    }

    let includeList: string[] | null = null
    if (includeListStr.length) {
      includeList = includeListStr.split(',').map(key => key.trim())
    }

    if (excludeListStr.length) {
      excludeList = excludeList.concat(
        excludeListStr.split(',').map(key => key.trim())
      )
    }

    core.debug(`Using include list: ${includeList?.join(', ')}`)
    core.debug(`Using exclude list: ${excludeList.join(', ')}`)

    for (const key of Object.keys(secrets)) {
      if (includeList && !includeList.includes(key)) {
        continue
      }

      if (excludeList.includes(key)) {
        continue
      }

      let newKey = keyPrefix.length ? `${keyPrefix}${key}` : key

      if (convert.length) {
        if (!convertTypes[convert]) {
          throw new Error(
            `Unknown convert value "${convert}". Available: ${Object.keys(
              convertTypes
            ).join(', ')}`
          )
        }
        newKey = convertTypes[convert](newKey)
      }

      core.exportVariable(newKey, secrets[key])
      core.info(`Exported secret ${newKey}`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
