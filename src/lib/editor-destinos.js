import municipios from '../data/municipios.json';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function validarDestinos(valor) {
  if (!Array.isArray(valor) || valor.length > 30) throw Error('Use no máximo 30 destinos.');
  const vistos = new Set();
  return valor.map(d => {
    const cidade = municipios.find(([n,u]) => n === d.nome && u === d.uf);
    if (!cidade) throw Error('Escolha uma cidade e UF da lista.');
    const chave = `${d.nome}|${d.uf}`;
    if (vistos.has(chave)) throw Error('A mesma cidade foi adicionada duas vezes.');
    vistos.add(chave);
    if ((d.lat == null) !== (d.lng == null)) throw Error('Preencha latitude e longitude juntas.');
    if (d.lat != null && (typeof d.lat !== 'number' || typeof d.lng !== 'number' || !Number.isFinite(d.lat) || !Number.isFinite(d.lng) || Math.abs(d.lat) > 90 || Math.abs(d.lng) > 180)) throw Error('Coordenadas inválidas.');
    return { nome: d.nome, uf: d.uf, ...(d.lat == null ? {} : {lat:d.lat,lng:d.lng}) };
  });
}

/** Sem geocodificador externo: cadastro municipal local e ajuste consciente. */
export function montarEditorDestinos(raiz, iniciais = []) {
  const criar = (tag, texto) => { const e = document.createElement(tag); if (texto) e.textContent = texto; return e; };
  const titulo = criar('h3','Destinos no mapa');
  raiz.append(titulo, criar('p','Opcional: adicione as cidades visitadas nesta viagem. Sem destinos extras, usamos o local do cadastro automaticamente. Clique no mapa para ajustar um ponto. Só conteúdo público aparece no site após a atualização.'));
  const lista = criar('div'); raiz.append(lista);
  const ler = () => [...lista.children].map(linha => ({ nome:linha.dataset.nome, uf:linha.dataset.uf, ...(linha.querySelector('[data-lat]').value === '' && linha.querySelector('[data-lng]').value === '' ? {} : {lat:linha.querySelector('[data-lat]').value === '' ? null : Number(linha.querySelector('[data-lat]').value),lng:linha.querySelector('[data-lng]').value === '' ? null : Number(linha.querySelector('[data-lng]').value)}) }));
  raiz.lerDestinos = () => validarDestinos(ler());
  const adicionar = d => {
    const linha = criar('div'); linha.className='pn-destino-mapa'; linha.dataset.nome=d.nome; linha.dataset.uf=d.uf;
    linha.append(criar('strong',`${d.nome} — ${d.uf}`));
    for (const [atributo,rotulo] of [['lat','Latitude'],['lng','Longitude']]) {
      const label=criar('label',rotulo); const input=criar('input'); input.type='number';input.step='any';input.min=atributo==='lat'?'-90':'-180';input.max=atributo==='lat'?'90':'180';input.dataset[atributo]='';input.value=d[atributo]??'';label.append(input);linha.append(label);
    }
    const mapa=criar('div');mapa.style.height='240px';mapa.style.margin='12px 0';mapa.setAttribute('aria-label',`Ajustar localização de ${d.nome}`);
    const botao=criar('button','Mostrar mapa / ajustar ponto');botao.type='button';botao.className='pn-btn pn-btn--claro';
    let instancia, marcador;
    const atualizar = ponto => { if(marcador) marcador.setLatLng(ponto);else marcador=L.circleMarker(ponto,{radius:9}).addTo(instancia); };
    botao.onclick=()=>{
      if(instancia) {instancia.invalidateSize();return;}
      linha.append(mapa);
      const cidade=municipios.find(([n,u])=>n===d.nome&&u===d.uf);
      const lat=linha.querySelector('[data-lat]'),lng=linha.querySelector('[data-lng]');
      const ponto=lat.value!==''&&lng.value!==''&&lat.validity.valid&&lng.validity.valid?[Number(lat.value),Number(lng.value)]:[Number(cidade[2]),Number(cidade[3])];
      instancia=L.map(mapa).setView(ponto,12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(instancia);atualizar(ponto);
      instancia.on('click',e=>{lat.value=e.latlng.lat.toFixed(6);lng.value=e.latlng.lng.toFixed(6);atualizar([e.latlng.lat,e.latlng.lng]);});
    };
    const automatico=criar('button','Usar centro da cidade');automatico.type='button';automatico.className='pn-btn--texto';automatico.onclick=()=>{linha.querySelector('[data-lat]').value='';linha.querySelector('[data-lng]').value='';if(instancia){instancia.remove();instancia=null;marcador=null;mapa.remove();}};
    const remover=criar('button','Remover destino');remover.type='button';remover.className='pn-btn--texto';remover.onclick=()=>{instancia?.remove();linha.remove();};
    linha.append(botao,automatico,remover);lista.append(linha);
  };
  iniciais.forEach(adicionar);
  const label=criar('label','Cidade e estado'); const entrada=criar('input');entrada.setAttribute('list','pn-cidades-mapa');entrada.placeholder='Ex.: Gravatá — PE';label.append(entrada);raiz.append(label);
  const opcoes=criar('datalist');opcoes.id='pn-cidades-mapa';
  for(const [nome,uf] of municipios){const o=criar('option');o.value=`${nome} — ${uf}`;opcoes.append(o);}raiz.append(opcoes);
  const aviso=criar('p');aviso.setAttribute('role','status');
  const botao=criar('button','Adicionar destino');botao.type='button';botao.className='pn-btn pn-btn--claro';botao.onclick=()=>{
    const cidade=municipios.find(([n,u])=>`${n} — ${u}`===entrada.value.trim());
    if(!cidade){aviso.textContent='Selecione uma cidade e UF da lista.';return;}
    const d={nome:cidade[0],uf:cidade[1]};
    try{validarDestinos([...ler(),d]);adicionar(d);entrada.value='';aviso.textContent='Destino adicionado.';}catch(e){aviso.textContent=e.message;}
  };raiz.append(botao,aviso);
}
