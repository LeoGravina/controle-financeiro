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
      // style: 'currency', // Removido para ter só o número formatado
      // currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Adiciona 'R$ ' manualmente se houver valor
  const displayValue = value ? `R$ ${formatCurrency(value)}` : '';

  return (
    <input
      type="text" // Usar text para permitir formatação
      placeholder="R$ 0,00"
      value={displayValue}
      onChange={handleChange}
      className="currency-input" // Classe para estilo
      {...props} // Passa outras props como aria-label
    />
  );
};

export default CurrencyInput;