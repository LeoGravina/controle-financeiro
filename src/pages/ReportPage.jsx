// ATUALIZADO: src/pages/ReportPage.jsx
// - Removido <Legend /> do PieChart.
// - Alterado BarChart para layout="horizontal".
// - Ajustadas props do BarChart (XAxis, YAxis, Bar, Margins).
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, /* Legend removido */
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { FaArrowLeft } from 'react-icons/fa';

import TransactionList from '../components/TransactionList';

// Tooltip Personalizado (Igual ao Dashboard)
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const percentValue = data.payload.percent; 
        let percentString = null;
        if (typeof percentValue === 'number' && !isNaN(percentValue)) {
            percentString = `Percentual: ${(percentValue * 100).toFixed(1)}%`;
        }
        return (
            <div className="custom-tooltip">
                <p className="label">{`${data.name}`}</p>
                <p className="value">{`Valor: ${data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
                {percentString && ( <p className="percent">{percentString}</p> )}
            </div>
        );
    }
    return null;
};

// Função para gerar dados (Igual ao Dashboard)
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

    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [fixedExpenses, setFixedExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState(null);
    const [reportMonth, setReportMonth] = useState(null);

    useEffect(() => { window.scrollTo(0, 0); }, []); 
    useEffect(() => {
        if (location.state && location.state.reportType && location.state.reportMonth) {
            setReportType(location.state.reportType);
            setReportMonth(new Date(location.state.reportMonth));
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
        if (!user) {
            setTransactions([]); setCategories([]); setFixedExpenses([]); setLoading(false); return;
        }
        setLoading(true);
        let listenersActive = true;
        const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), (snap) => { if (listenersActive) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))) }, err => console.error("Erro Cat:", err));
        const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), where('userId', '==', user.uid)), (snap) => {
            if (listenersActive) {
                setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })));
                setLoading(false); 
            }
        }, err => { console.error("Erro Trans:", err); if (listenersActive) setLoading(false); });
        const unsubFixedExpenses = onSnapshot(query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid)), (snap) => { if (listenersActive) setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))) }, err => console.error("Erro Fixed:", err));
        return () => { listenersActive = false; unsubCategories(); unsubTransactions(); unsubFixedExpenses(); };
    }, [user]);

    const allTransactionsForMonth = useMemo(() => {
        if (!reportMonth) return [];
        const month = reportMonth.getMonth();
        const year = reportMonth.getFullYear();
        let monthTransactions = transactions.filter(t => 
            new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year
        );
        fixedExpenses.forEach(fixed => {
            const paidVersionExists = monthTransactions.some(t => 
                !t.isFixed && t.isPaid && t.description.toLowerCase().includes(fixed.description.toLowerCase()) && new Date(t.date).getDate() === fixed.dayOfMonth
            );
            if (!paidVersionExists) {
                monthTransactions.push({
                    id: `fixed-${fixed.id}-${year}-${month}`, 
                    description: fixed.description, amount: fixed.amount,
                    date: new Date(year, month, fixed.dayOfMonth), 
                    type: 'expense', category: fixed.category, isPaid: false, isFixed: true,
                });
            }
        });
        return monthTransactions;
    }, [transactions, fixedExpenses, reportMonth]);
    const filteredTransactions = useMemo(() => {
        if (!reportType) return [];
        return allTransactionsForMonth.filter(t => t.type === reportType);
    }, [allTransactionsForMonth, reportType]);
    const chartData = useMemo(() => {
        if (!reportType || !filteredTransactions.length) return [];
        return generateChartData(filteredTransactions, reportType, categories);
    }, [filteredTransactions, reportType, categories]);

    const handleBack = () => navigate('/');

    if (loading || !reportType || !reportMonth) {
        return ( <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div> );
    }

    const monthName = reportMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const title = reportType === 'income' ? 'Relatório de Ganhos' : 'Relatório de Gastos';
    const totalValue = chartData.reduce((acc, item) => acc + item.value, 0);

    return (
        <div className="dashboard-container report-container">
            <header className="report-header">
                <button onClick={handleBack} className="signout-button">
                    <FaArrowLeft style={{ marginRight: '8px' }} /> Voltar
                </button>
                <div className="report-title">
                    <h1>{title}</h1>
                    <h2>{monthName}</h2>
                </div>
                <div className={`report-total ${reportType}`}>
                    <span>Total {reportType === 'income' ? 'Recebido' : 'Gasto'}</span>
                    <strong className={reportType}>
                        {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                </div>
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
                                {/* Legend REMOVIDA */}
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="empty-message">Sem dados para exibir.</p>}
                </div>

                <div className="report-chart-item card-style">
                    <h3>Histograma (Gráfico de Barras)</h3>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart 
                                data={chartData} 
                                layout="horizontal" // ALTERADO
                                margin={{ top: 5, right: 30, left: 10, bottom: 50 }} // Margem inferior maior
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="name" 
                                    type="category" 
                                    tick={{ fontSize: 11 }} 
                                    interval={0} 
                                    angle={-45} // Ângulo maior para evitar sobreposição
                                    textAnchor="end" 
                                    height={60} // Mais espaço para labels
                                />
                                <YAxis 
                                    type="number" 
                                    className="yAxis" 
                                    tickFormatter={(value) => `R$${value/1000}k`} 
                                    width={50} 
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" >
                                    {chartData.map((entry) => (
                                        <Cell key={`cell-bar-${entry.name}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="empty-message">Sem dados para exibir.</p>}
                </div>
            </div>

            <div className="report-list-container card-style">
                <h3>Transações Detalhadas ({filteredTransactions.length})</h3>
                <div className="list-container">
                    <TransactionList
                        transactions={filteredTransactions.sort((a,b) => b.amount - a.amount)} 
                        categories={categories}
                        onDeleteTransaction={() => {}}
                        onEditTransaction={() => {}}
                        onTogglePaid={() => {}}
                    />
                </div>
            </div>

        </div>
    );
};

export default ReportPage;