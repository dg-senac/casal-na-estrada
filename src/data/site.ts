/**
 * Configuração central do site.
 * Tudo que é "da vida real" do casal fica aqui — edite só este arquivo
 * e os textos se atualizam no site inteiro.
 */
export const site = {
  nome: 'Casal na Estrada',
  nomes: 'Cieri & Milla',
  desde: 2023,
  base: 'Recife — PE',
  lema: 'Cieri e Milla',
  descricao:
    'Diário de estrada de Cieri e Milla, um casal de Recife que roda o Brasil de moto atrás de encontros, moto casais e boas histórias.',
  email: 'contato@casalnaestrada.com.br',
  // WhatsApp em formato internacional, só dígitos (é o que o wa.me espera).
  whatsapp: '5581986941562',
  whatsappExibicao: '(81) 98694-1562',
  whatsappTexto: 'Olá! Encontrei o site de vocês e queria trocar uma ideia.',
  instagram: 'https://instagram.com/casa_naestrada2.4',
  instagramUsuario: '@casa_naestrada2.4',
  mapa: 'https://maps.google.com/?q=Recife,+PE',
};

export type Site = typeof site;
