import React from 'react';

const CurrencyInput = ({ value, onChange, ...props }) => {
  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      onChange('');
      return;
    }
    const numericValue = parseInt(rawValue, 10) / 100;
    onChange(numericValue);
  };

  const formatCurrency = (val) => {
    if (val === '' || val === null || val === undefined || isNaN(val)) return '';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const displayValue = value ? `R$ ${formatCurrency(value)}` : '';

  return (
    <input
      type="text" 
      placeholder="R$ 0,00"
      value={displayValue}
      onChange={handleChange}
      className="currency-input" 
      {...props} 
    />
  );
};

export default CurrencyInput;