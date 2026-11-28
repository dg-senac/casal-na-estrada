import assert from 'node:assert/strict';
import {referenciaFotoAdmin} from '../src/lib/midia-privada.js';
const base='https://pjglrlullnchqazxpvyn.supabase.co';
assert.deepEqual(referenciaFotoAdmin(base,base+'/storage/v1/object/public/midia/antigas/foto%201.jpg'),{bucket:'midia',caminho:'antigas/foto 1.jpg'});
assert.deepEqual(referenciaFotoAdmin(base,'https://casal-na-estrada.douglasmarista02.workers.dev/midia-protegida/midia/antiga.jpg'),{bucket:'midia',caminho:'antiga.jpg'});
for(const url of [base+'/storage/v1/object/public/midia/../segredo',base+'/storage/v1/object/public/midia/x?token=1','https://externo.invalid/foto.jpg'])assert.equal(referenciaFotoAdmin(base,url),null);
console.log('Prévia admin legada: referências reconhecidas para download autenticado sem mudar URLs persistidas; caminhos externos/traversal negados.');
