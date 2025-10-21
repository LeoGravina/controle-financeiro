import React from 'react';

const SummaryCard = ({ title, value, type }) => {
  const isNegative = type === 'balance' && value < 0;

  return (
    <div className={`summary-card ${isNegative ? 'negative' : ''}`} data-type={type}>
      <p>{title}</p>
      <span>
        R$ {(value || 0).toFixed(2).replace('.', ',')}
      </span>
    </div>
  );
};

export default SummaryCard;