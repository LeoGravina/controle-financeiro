import React from 'react';

const SummaryCard = ({ title, value, type, onClick, isActive, ...props }) => {
  const isNegative = type === 'balance' && value < 0;
  const cardClass = `summary-card ${isNegative ? 'negative' : ''} ${onClick ? 'clickable' : ''} ${isActive ? 'active' : ''}`;

  const tooltip = props['data-tooltip'] || '';

  return (
    <div
      className={cardClass}
      data-type={type}
      onClick={onClick}
      data-tooltip={tooltip} 
    >
      <p>{title}</p>
      <span>
        {(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
};

export default SummaryCard;