import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['./src'],
	splitting: false,
	sourcemap: false,
	clean: true,
});

//import { defineConfig } from 'tsup'

//export default defineConfig({
//  entry: ['./src/bin/www/server.ts'],
//  format: ['esm'],
//  target: 'node20',
//  outDir: 'dist',
//  clean: true,
//  sourcemap: true
//})
