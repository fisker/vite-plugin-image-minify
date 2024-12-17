import url from 'node:url'
import fs from 'node:fs/promises'
import {expect, test} from 'vitest'
import prettyBytes from 'pretty-bytes'
import * as vite from 'vite'
import vitePluginImageSquoosh from './index.js'

const FIXTURES_DIRECTORY = new URL('./fixtures/', import.meta.url)
const prettySize = (size) => `${prettyBytes(size)} (${size})`

async function runVite() {
  /** @type {import('vite').Rollup.RollupOutput} */
  const buildResult = await vite.build({
    root: url.fileURLToPath(FIXTURES_DIRECTORY),
    configFile: false,
    envFile: false,
    write: false,
    logLevel: 'warn',
    plugins: [vitePluginImageSquoosh({cache: false})],
    build: {assetsInlineLimit: 0},
  })

  const assets = buildResult.output
    .filter(
      (assetOrChunk) => assetOrChunk.type === 'asset' && assetOrChunk.name,
    )
    .sort((imageA, imageB) => imageA.name.localeCompare(imageB.name))

  const result = await Promise.all(
    assets.map(async (asset) => {
      const {length: originalSize} = await fs.readFile(
        new URL(asset.name, FIXTURES_DIRECTORY),
      )
      const bundledSize = asset.source.length
      const savedBytes = bundledSize - originalSize
      const savedPercentage = `${((savedBytes / originalSize) * 100).toFixed(2)}%`

      return {
        original: {
          name: asset.name,
          size: prettySize(originalSize),
        },
        bundled: {
          name: asset.fileName,
          size: prettySize(bundledSize),
        },
        saved: {
          percentage: savedPercentage,
          size: prettySize(savedBytes),
        },
      }
    }),
  )

  return result
}

test('Main', async () => {
  const result = await runVite()

  expect(result).toMatchSnapshot()
})
