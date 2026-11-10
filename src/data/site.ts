/**
 * Configuração central do site.
 * Tudo que é "da vida real" do casal fica aqui — edite só este arquivo
 * e os textos se atualizam no site inteiro.
 */
export const site = {
  nome: 'Casal na Estrada',
  nomes: 'Cieri & Milla',
  desde: 2013,
  base: 'Recife — PE',
  lema: 'Cieri e Milla',
  descricao:
    'Diário de estrada de Cieri e Milla, um casal de Recife que roda o Brasil de moto atrás de encontros, moto casais e boas histórias.',
  // Troque pelos contatos reais
  email: 'contato@casalnaestrada.com.br',
  whatsapp: '5581999999999',
  whatsappTexto: 'Olá! Encontrei o site de vocês e queria trocar uma ideia.',
  instagram: 'https://instagram.com/casalnaestrada',
  mapa: 'https://maps.google.com/?q=Recife,+PE',
};

export type Site = typeof site;
