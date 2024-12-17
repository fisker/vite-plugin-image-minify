import minifyImages from 'image-minimizer'

/**
@param {{cache?: boolean, onFileExtensionError?: 'error' | 'warn' | (file) => void}} [options]
@return {import('vite').Plugin}
*/
function createVitePluginImageMinify(options) {
  return {
    name: 'vite-plugin-image-minify',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const assets = Object.entries(bundle)
        .filter(([, {type}]) => type === 'asset')
        .map(([name, asset]) => ({name, asset}))

      if (assets.length === 0) {
        return
      }

      const compressed = await minifyImages(
        assets.map(({name, asset}) => ({name, content: asset.source})),
        options,
      )

      for (const [index, {asset}] of assets.entries()) {
        asset.source = compressed[index]
      }
    },
  }
}

export default createVitePluginImageMinify
