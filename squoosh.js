import module from 'node:module'
import * as path from 'node:path'
import url from 'node:url'
import os from 'node:os'
import fs from 'node:fs/promises'

const LIB_SQUOOSH_HACK_CODE = 'var fetch;'

async function importLibrarySquoosh() {
  const libsquooshEntry = module
    .createRequire(import.meta.url)
    .resolve('@frostoven/libsquoosh')
  const content = await fs.readFile(libsquooshEntry, 'utf8')

  if (!content.startsWith(LIB_SQUOOSH_HACK_CODE)) {
    await fs.writeFile(libsquooshEntry, LIB_SQUOOSH_HACK_CODE + content)
  }

  return import(url.pathToFileURL(libsquooshEntry).href)
}

const encoders = new Map([
  ['.jpg', 'mozjpeg'],
  ['.jpeg', 'mozjpeg'],
  ['.webp', 'webp'],
  // ['.avif', 'avif'],
  // ['.jxl', 'jxl'],
  // ['.wp2', 'wp2'],
  ['.png', 'oxipng'],
])

function getEncoder(filename) {
  return encoders.get(path.extname(filename).toLowerCase())
}

/**
 * @param {{content: Buffer, name: string}[]} files
 * @returns {Uint8Array[]}
 */
async function squooshImages(files, cache) {
  if (files.length === 0) {
    return []
  }

  let imagePoolLoadPromise
  let imagePool

  function getImagePool() {
    imagePoolLoadPromise ??= (async () => {
      const {ImagePool} = await importLibrarySquoosh()
      imagePool = new ImagePool(os.cpus().length)
      return imagePool
    })()

    return imagePoolLoadPromise
  }

  let result

  try {
    result = await Promise.all(
      files.map(async ({content: original, name}) => {
        const encoder = getEncoder(name)
        if (!encoder) {
          return original
        }

        const cached = cache.getCachedData(original)

        if (cached) {
          return cached
        }

        const imagePool = await getImagePool()
        const image = imagePool.ingestImage(original)
        await image.encode({[encoder]: undefined})
        const result = await image.encodedWith[encoder]
        const compressed = result.binary
        const data = compressed.length < original.length ? compressed : original

        return data
      }),
    )
  } finally {
    imagePool?.close()
  }

  return result
}

const isSupportedImage = (filename) => Boolean(getEncoder(filename))

export {squooshImages, isSupportedImage}
