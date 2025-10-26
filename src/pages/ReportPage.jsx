// src/pages/ReportPage.jsx (COMPLETO COM GRÁFICO DE LINHAS COMPARATIVO)
// - Gráfico comparativo usa LineChart.
// - Mostra APENAS Ganhos ou APENAS Gastos na linha, dependendo do 'reportType'.
// - Inclui busca do mês anterior, cálculos, filtros e scroll.
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore'; 
import { auth, db } from '../firebase/config';
import Select from 'react-select'; 
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, // Mantém BarChart para o histograma
    LineChart, Line // Adiciona LineChart e Line
} from 'recharts';
import { FaArrowLeft } from 'react-icons/fa';

import TransactionList from '../components/TransactionList';

// Tooltip Personalizado (Ajustado para funcionar com LineChart também)
const CustomTooltip = ({ active, payload, label }) => { 
    if (active && payload && payload.length) {
        const dataPoint = payload[0]; // Pega o primeiro ponto de dados
        
        // Para PieChart ou Histograma por Categoria (verifica se tem 'percent' ou 'name' no payload interno)
        if (dataPoint.payload.percent !== undefined || dataPoint.payload.name !== undefined) {
            const data = dataPoint;
            const name = data.name || data.payload.name; 
            const percentValue = data.payload.percent;
            let percentString = null;
            if (typeof percentValue === 'number' && !isNaN(percentValue)) {
                percentString = `Percentual: ${(percentValue * 100).toFixed(1)}%`;
            }
            return (
                <div className="custom-tooltip">
                    <p className="label">{`${name}`}</p>
                    <p className="value">{`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
                    {percentString && ( <p className="percent">{percentString}</p> )}
                </div>
            );
        } 
        // Para LineChart Comparativo (ou BarChart comparativo com label)
        else if (label) {
             return (
                <div className="custom-tooltip">
                    <p className="label">{`${label}`}</p>
                    {payload.map((entry, index) => ( // Itera para caso haja múltiplas linhas/barras
                         <p key={`item-${index}`} style={{ color: entry.color }}>
                            {`${entry.name}: ${entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </p>
                    ))}
                </div>
            );
        }
    }
    return null;
};

// Função para gerar dados (para Pizza e Histograma)
const generateChartData = (transactions, type, categories) => {
    const filtered = transactions.filter(t => t.type === type);
    const total = filtered.reduce((acc, t) => acc + t.amount, 0);
    if (total === 0) return [];
    const grouped = filtered.reduce((acc, t) => {
        const categoryName = t.category || 'Outros';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
    }, {});
    return Object.entries(grouped)
        .map(([name, value]) => {
            const category = categories.find(cat => cat.name === name);
            return { name, value, percent: value / total, color: category ? category.color : '#bdc3c7' };
        })
        .sort((a, b) => b.value - a.value); 
};


const ReportPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Estados
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]); 
    const [previousMonthTransactions, setPreviousMonthTransactions] = useState([]); 
    const [categories, setCategories] = useState([]);
    const [fixedExpenses, setFixedExpenses] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState(null); 
    const [reportMonth, setReportMonth] = useState(null); 
    const [reportDescriptionFilter, setReportDescriptionFilter] = useState('');
    const [reportCategoryFilter, setReportCategoryFilter] = useState(null); 

    // Efeitos
    useEffect(() => { window.scrollTo(0, 0); }, []); 
    useEffect(() => {
        if (location.state && location.state.reportType && location.state.reportMonth) {
            setReportType(location.state.reportType);
            const monthDate = new Date(location.state.reportMonth);
            monthDate.setDate(1); monthDate.setHours(0,0,0,0);
            setReportMonth(monthDate);
        } else {
            console.warn("Nenhum estado de relatório encontrado, redirecionando...");
            navigate('/');
        }
    }, [location, navigate]);
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, currentUser => setUser(currentUser || null));
        return () => unsubAuth();
    }, []);
    useEffect(() => { 
        if (!user || !reportMonth) { 
            setCategories([]); setFixedExpenses([]); setTransactions([]); setPreviousMonthTransactions([]);
            setLoading(false); 
            return;
        }
        setLoading(true); 
        let listenersActive = true;

        const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), (snap) => { 
            if (listenersActive) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, err => console.error("Erro Cat:", err));
         const unsubFixedExpenses = onSnapshot(query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid)), (snap) => { 
             if (listenersActive) setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
         }, err => console.error("Erro Fixed:", err));
        const fetchMonthlyTransactions = async () => {
            try {
                const currentMonthStart = Timestamp.fromDate(reportMonth);
                const nextMonthDate = new Date(reportMonth); nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                const currentMonthEnd = Timestamp.fromDate(nextMonthDate);
                const previousMonthDate = new Date(reportMonth); previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
                const previousMonthStart = Timestamp.fromDate(previousMonthDate);
                const previousMonthEnd = currentMonthStart; 
                const currentQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('date', '>=', currentMonthStart), where('date', '<', currentMonthEnd));
                const previousQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid), where('date', '>=', previousMonthStart), where('date', '<', previousMonthEnd));
                const [currentSnapshot, previousSnapshot] = await Promise.all([ getDocs(currentQuery), getDocs(previousQuery) ]);
                if (listenersActive) {
                    setTransactions(currentSnapshot.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })));
                    setPreviousMonthTransactions(previousSnapshot.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })));
                }
            } catch (error) {
                console.error("Erro ao buscar transações mensais:", error);
                if(listenersActive) { setTransactions([]); setPreviousMonthTransactions([]); }
            } finally {
                 if (listenersActive) setLoading(false); 
            }
        };
        fetchMonthlyTransactions();
        return () => { listenersActive = false; unsubCategories(); unsubFixedExpenses(); };
    }, [user, reportMonth]); 
    useEffect(() => {
        const listElement = document.querySelector('.report-inner-list-container ul'); 
        if (listElement) { listElement.scrollTop = 0; }
    }, [reportDescriptionFilter, reportCategoryFilter]); 

    // Cálculos
    const allTransactionsForMonth = useMemo(() => {
        if (!reportMonth) return [];
        const month = reportMonth.getMonth();
        const year = reportMonth.getFullYear();
        let monthTransactions = [...transactions]; 
        fixedExpenses.forEach(fixed => { 
             const paidVersionExists = monthTransactions.some(t => !t.isFixed && t.isPaid && t.description.toLowerCase().includes(fixed.description.toLowerCase()) && new Date(t.date).getDate() === fixed.dayOfMonth);
            if (!paidVersionExists && fixed.type === 'expense') { 
                monthTransactions.push({
                    id: `fixed-${fixed.id}-${year}-${month}`, description: fixed.description, amount: fixed.amount,
                    date: new Date(year, month, fixed.dayOfMonth), type: 'expense', category: fixed.category, isPaid: false, isFixed: true,
                });
            }
         });
        return monthTransactions;
    }, [transactions, fixedExpenses, reportMonth]); 

    const reportCategoryFilterOptions = useMemo(() => [ 
        ...categories.map(cat => ({ value: cat.name, label: cat.name })).sort((a, b) => a.label.localeCompare(b.label))
    ], [categories]);

    const filteredTransactions = useMemo(() => {
        if (!reportType) return [];
        let baseList = allTransactionsForMonth.filter(t => t.type === reportType); 
        const descLower = reportDescriptionFilter.toLowerCase();
        const selectedCategoryNames = reportCategoryFilter ? reportCategoryFilter.map(opt => opt.value.toLowerCase()) : [];
        return baseList.filter(t => { 
             const descriptionMatch = t.description?.toLowerCase().includes(descLower) ?? true;
             const categoryMatch = selectedCategoryNames.length === 0 || selectedCategoryNames.includes(t.category?.toLowerCase());
             return descriptionMatch && categoryMatch;
        });
    }, [allTransactionsForMonth, reportType, reportDescriptionFilter, reportCategoryFilter]); 

    const { currentMonthIncomeTotal, currentMonthExpenseTotal, previousMonthIncomeTotal, previousMonthExpenseTotal } = useMemo(() => {
        let currentIncome = 0, currentExpense = 0;
        filteredTransactions.forEach(t => { if (t.type === 'income') currentIncome += t.amount; else currentExpense += t.amount; });
        let previousIncome = 0, previousExpense = 0;
        previousMonthTransactions.forEach(t => { if (t.type === 'income') previousIncome += t.amount; else previousExpense += t.amount; });
        return { currentMonthIncomeTotal: currentIncome, currentMonthExpenseTotal: currentExpense, previousMonthIncomeTotal: previousIncome, previousMonthExpenseTotal: previousExpense };
    }, [filteredTransactions, previousMonthTransactions]); 

    const chartData = useMemo(() => {
        if (!reportType || !filteredTransactions.length) return [];
        return generateChartData(filteredTransactions, reportType, categories); 
    }, [filteredTransactions, reportType, categories]); 

    // Dados para o Gráfico Comparativo (Linha única)
    const comparisonChartData = useMemo(() => {
        if (!reportMonth || !reportType) { 
            return [{ month: '', [reportType === 'income' ? 'Ganhos' : 'Gastos']: 0 }, { month: '', [reportType === 'income' ? 'Ganhos' : 'Gastos']: 0 }]; 
        }
        const previousMonthName = new Date(reportMonth.getFullYear(), reportMonth.getMonth() - 1).toLocaleString('pt-BR', { month: 'short' }); 
        const currentMonthName = reportMonth.toLocaleString('pt-BR', { month: 'short' }); 
        const dataKey = reportType === 'income' ? 'Ganhos' : 'Gastos';
        const previousValue = reportType === 'income' ? previousMonthIncomeTotal : previousMonthExpenseTotal;
        const currentValue = reportType === 'income' ? currentMonthIncomeTotal : currentMonthExpenseTotal;
        return [ { month: previousMonthName, [dataKey]: previousValue }, { month: currentMonthName + " (Filt.)", [dataKey]: currentValue }, ];
    }, [reportMonth, reportType, currentMonthIncomeTotal, currentMonthExpenseTotal, previousMonthIncomeTotal, previousMonthExpenseTotal]);

    const handleBack = () => navigate('/');

    if (loading || !reportMonth) { 
        return ( <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados do relatório...</div> );
    }

    const monthName = reportMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const title = reportType === 'income' ? 'Relatório de Ganhos' : 'Relatório de Gastos';
    const totalValue = reportType === 'income' ? currentMonthIncomeTotal : currentMonthExpenseTotal; 
    const comparisonDataKey = reportType === 'income' ? 'Ganhos' : 'Gastos';
    const comparisonLineColor = reportType === 'income' ? 'var(--income-color)' : 'var(--expense-color)';

    return (
        <div className="dashboard-container report-container">
            <header className="report-header">
                <button onClick={handleBack} className="signout-button"> <FaArrowLeft style={{ marginRight: '8px' }} /> Voltar </button>
                <div className="report-title"> <h1>{title}</h1> <h2>{monthName}</h2> </div>
                <div className={`report-total ${reportType}`}> <span>Total {reportType === 'income' ? 'Recebido' : 'Gasto'} (Filtrado)</span> <strong className={reportType}> {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} </strong> </div>
            </header>

            <div className="report-grid">
                <div className="report-chart-item card-style">
                    <h3>Gráfico de Pizza</h3>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}> 
                            <PieChart>
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} >
                                    {chartData.map((entry) => <Cell key={`cell-pie-${entry.name}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="empty-message">Sem dados para exibir.</p>}
                </div>

                <div className="report-chart-item card-style">
                    <h3>Distribuição por Categoria (Barras)</h3> 
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={chartData} layout="horizontal" margin={{ top: 5, right: 30, left: 10, bottom: 50 }} >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" type="category" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis type="number" className="yAxis" tickFormatter={(value) => `R$${value/1000}k`} width={50} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" >
                                    {chartData.map((entry) => (<Cell key={`cell-bar-${entry.name}`} fill={entry.color} /> ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="empty-message">Sem dados para exibir.</p>}
                </div>
            </div>

            {/* Gráfico Comparativo Mensal (AGORA COM LINHAS) */}
            <div className="report-comparison-chart card-style">
                 <h3>Comparativo Mês Anterior ({comparisonDataKey})</h3>
                 {(comparisonChartData[0][comparisonDataKey] > 0 || comparisonChartData[1][comparisonDataKey] > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={comparisonChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(1)}k`} width={60} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} /> 
                            {/* Legend removida */}
                            <Line 
                                type="monotone" 
                                dataKey={comparisonDataKey} 
                                name={comparisonDataKey} // Adiciona nome para o tooltip funcionar corretamente
                                stroke={comparisonLineColor} 
                                strokeWidth={3} 
                                dot={{ r: 5 }} 
                                activeDot={{ r: 7 }} 
                            /> 
                        </LineChart>
                    </ResponsiveContainer>
                 ) : (
                     <p className="empty-message">Sem dados suficientes para comparação.</p>
                 )}
            </div>

            {/* Lista de Transações */}
            <div className="report-list-container card-style">
                <div className="list-container-header report-list-header"> 
                    <h3>Transações Detalhadas ({filteredTransactions.length})</h3>
                    <div className="transaction-list-filters">
                        <input type="text" placeholder="🔍 Filtrar por descrição..." value={reportDescriptionFilter} onChange={(e) => setReportDescriptionFilter(e.target.value)} className="filter-input description-filter" />
                         <Select options={reportCategoryFilterOptions} value={reportCategoryFilter} onChange={setReportCategoryFilter} placeholder="Categoria(s)..." isClearable={true} isMulti closeMenuOnSelect={false} hideSelectedOptions={false} controlShouldRenderValue={false} className="filter-input category-filter" classNamePrefix="react-select" />
                    </div>
                </div>
                <div className="list-container report-inner-list-container"> 
                    <TransactionList transactions={filteredTransactions.sort((a,b) => b.amount - a.amount)} categories={categories} onDeleteTransaction={() => {}} onEditTransaction={() => {}} onTogglePaid={() => {}} />
                </div>
            </div>

        </div>
    );
};

export default ReportPage;