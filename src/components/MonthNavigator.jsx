import React, { useState, useEffect } from 'react';

const MonthNavigator = ({ currentMonth, setCurrentMonth }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const dateLabel = isMobile
    ? currentMonth.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }).replace(' de ', '/') 
    : currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }); 

  return (
    <div className="month-navigator">
      <button onClick={handlePrevMonth}>&lt;</button>
      <h2 style={{ textTransform: 'capitalize' }}>{dateLabel}</h2>
      <button onClick={handleNextMonth}>&gt;</button>
    </div>
  );
};

export default MonthNavigator;