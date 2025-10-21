import React from 'react';

const MonthNavigator = ({ currentMonth, setCurrentMonth }) => {
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="month-navigator">
      <button onClick={handlePrevMonth}>&lt; Anterior</button>
      <h2>{currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
      <button onClick={handleNextMonth}>Próximo &gt;</button>
    </div>
  );
};

export default MonthNavigator;