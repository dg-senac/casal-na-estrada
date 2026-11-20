import assert from 'node:assert/strict';
import { distanciaComUnidade } from '../src/lib/distancia.js';
for (const [entrada, esperado] of [
 ['186','186 km'], [' 186 ','186 km'], ['0','0 km'], ['1.250','1.250 km'],
 ['186,5','186,5 km'], ['1 250','1 250 km'], ['186 km','186 km'],
 ['186 KM','186 KM'], ['186km','186km'], ['186 quilômetros','186 quilômetros'],
 ['186 km (ida e volta)','186 km (ida e volta)'], ['A confirmar','A confirmar'],
 ['', ''], ['   ',''], [null,''], [undefined,''],
]) assert.equal(distanciaComUnidade(entrada), esperado);
console.log('Distância: unidade, valores existentes, decimais e campos vazios aprovados.');
