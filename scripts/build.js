const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['assets/app.jsx'],
  bundle: true,
  minify: true,
  outfile: 'assets/app.js',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
}).then(() => {
  console.log('Build completed');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
