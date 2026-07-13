import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig,loadEnv} from 'vite';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,'.','');
  return {
    plugins:[react(),tailwindcss()],
    server:{
      port:5174,
      proxy:{'/api':{target:env.VITE_DEV_API_PROXY_TARGET||'http://localhost:5800',changeOrigin:true}},
    },
    build:{
      sourcemap:false,
      rollupOptions:{
        output:{
          manualChunks(id){
            const moduleId=id.replace(/\\/g,'/');
            if(!moduleId.includes('/node_modules/'))return undefined;
            if(/\/node_modules\/(?:react|react-dom|react-is|scheduler)\//.test(moduleId))return 'react-vendor';
            if(/\/node_modules\/(?:recharts|react-smooth|victory-vendor|decimal.js-light|tiny-invariant)\//.test(moduleId))return 'charts-vendor';
            if(moduleId.includes('/node_modules/lucide-react/'))return 'icons-vendor';
            return undefined;
          },
        },
      },
    },
  };
});
