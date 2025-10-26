// ATUALIZADO: src/components/SummaryCard.jsx
import React from 'react';

// 1. Adiciona "...props" para capturar atributos extras
const SummaryCard = ({ title, value, type, onClick, isActive, ...props }) => {
  const isNegative = type === 'balance' && value < 0;
  const cardClass = `summary-card ${isNegative ? 'negative' : ''} ${onClick ? 'clickable' : ''} ${isActive ? 'active' : ''}`;

  // 2. Extrai o tooltip das props (se existir)
  const tooltip = props['data-tooltip'] || '';

  return (
    // 3. Aplica onClick e data-tooltip ao div principal
    <div
      className={cardClass}
      data-type={type}
      onClick={onClick}
      data-tooltip={tooltip} // <<<<<< ADICIONADO AQUI
    >
      <p>{title}</p>
      <span>
        {/* Usando toLocaleString para formatação de moeda */}
        {(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
};

export default SummaryCard;