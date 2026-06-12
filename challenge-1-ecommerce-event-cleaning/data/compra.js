/**
 * Objeto original capturado pelo site (enunciado do desafio).
 *
 * Esta é a "fonte raw": o estado bruto, com todas as inconsistências
 * propositais que serão tratadas pela cadeia de funções das questões.
 *
 * REGRA DO DESAFIO: este arquivo NUNCA é alterado. Todas as funções nas
 * questões 1 a 4 leem este objeto e retornam NOVAS estruturas, sem
 * mutar nada aqui dentro.
 *
 * Exportação em CommonJS (require) para máxima compatibilidade com
 * qualquer versão de Node.js que a avaliador utilizar para avaliar.
 */

const compra = {
  event: "purchase",
  ecommerce: {
    purchase: {
      actionField: {
        transaction_id: "T_12345",
        value: undefined,
        tax: 3.60,
        shipping: 5.99,
        currency: "BRL",
        coupon: "SUMMER_SALE",
        customer_type: "new",
      },
      items: [
        { item_id: "PRD_VEST_123",   item_name: "Tênis",           price: 199.90,       quantity: 2 },
        { item_id: "PRD_ELETRO_123", item_name: "Celular",         price: "2.015,90",   quantity: 1 },
        { item_id: "PRD_ELETRO_123", item_name: "Celular",         price: "2.015,90",   quantity: 1 },
        { item_id: "PRD_ELETRO_456", item_name: "Tablet",          price: "1725,50",    quantity: 1 },
        { item_id: "PRD_ELETRO_789", item_name: "Notebook",        price: 1673.50,      quantity: 1 },
        { item_id: "PRD_ELETRO_987", item_name: "Câmera digital",  price: "1250.90",    quantity: 1 },
        { item_id: "PRD_VEST_456",   item_name: "Calça Jeans",     price: "R$ 341,90",  quantity: 1 },
        { item_id: "PRD_ALIM_123",   item_name: "Vinho Português", price: "€ 215,90",   quantity: 1 },
        { item_id: "PRD_ALIM_456",   item_name: "Vinho Espanhol",  price: 350.90 },
        { item_id: "PRD_ALIM_456",   item_name: "Vinho Espanhol",  price: 350.90 },
        { item_id: "PRD_ALIM_789",   item_name: "Vinho Italiano",  price: null,         quantity: 2 },
        { item_id: "",               item_name: "Capa de chuva",   price: 39.90,        quantity: 1 },
        { item_id: "PRD_VEST_123",   item_name: "Tênis",           price: 199.90,       quantity: 2 },
      ],
    },
  },
};

module.exports = { compra };
