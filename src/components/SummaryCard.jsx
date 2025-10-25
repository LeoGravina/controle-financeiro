// VERIFICAR/ATUALIZAR: src/components/SummaryCard.jsx
import React from 'react';

const SummaryCard = ({ title, value, type, onClick, isActive }) => {
  const isNegative = type === 'balance' && value < 0;
  // Adiciona 'clickable' se houver onClick e 'active' se isActive for true
  const cardClass = `summary-card ${isNegative ? 'negative' : ''} ${onClick ? 'clickable' : ''} ${isActive ? 'active' : ''}`;

  return (
    // Aplica onClick apenas se a função for fornecida
    <div className={cardClass} data-type={type} onClick={onClick}>
      <p>{title}</p>
      <span>
        R$ {(value || 0).toFixed(2).replace('.', ',')}
      </span>
    </div>
  );
};

export default SummaryCard;

