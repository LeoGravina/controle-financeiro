// ATUALIZADO: src/pages/ReportPage.jsx
// - Coloca BudgetProgressList e GoalProgressList DENTRO de um único card.
// - Usa 'report-summary-grid' para layout interno responsivo (lado a lado / empilhado).
// - Adicionado botão "Ver Relatório de Ganhos/Gastos".
// - Passa 'isReadOnly={true}' para o TransactionList.
// - Busca e exibe BudgetProgressList e GoalProgressList (sem ações).
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
// query, onSnapshot, getDocs, Timestamp importados ou já existentes
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore'; 
import { auth, db } from '../firebase/config';
import Select from 'react-select'; 
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    LineChart, Line 
} from 'recharts';
import { FaArrowLeft, FaSyncAlt } from 'react-icons/fa'; 

import TransactionList from '../components/TransactionList';
import BudgetProgressList from '../components/BudgetProgressList';
import GoalProgressList from '../components/GoalProgressList';

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
    const [budgets, setBudgets] = useState([]);
    const [goals, setGoals] = useState([]);
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
    
    // useEffect principal para buscar todos os dados necessários
    useEffect(() => { 
        if (!user || !reportMonth) { 
            setCategories([]); setFixedExpenses([]); setTransactions([]); setPreviousMonthTransactions([]);
            setBudgets([]); setGoals([]); // Limpa os novos estados
            setLoading(false); 
            return;
        }
        setLoading(true); 
        let listenersActive = true;
        // Adiciona flags para budgets e goals
        let dataLoaded = { categories: false, fixedExpenses: false, transactions: false, budgets: false, goals: false }; 

        const checkLoadingDone = () => {
            if (listenersActive && Object.values(dataLoaded).every(status => status === true)) {
                setLoading(false);
            }
        };

        // Listeners existentes (categories, fixedExpenses)
        const unsubCategories = onSnapshot(query(collection(db, 'categories'), where('userId', '==', user.uid)), (snap) => { 
            if (listenersActive) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dataLoaded.categories = true; checkLoadingDone();
        }, err => { console.error("Erro Cat:", err); dataLoaded.categories = true; checkLoadingDone(); });
        
        const unsubFixedExpenses = onSnapshot(query(collection(db, 'fixedExpenses'), where('userId', '==', user.uid)), (snap) => { 
             if (listenersActive) setFixedExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))); dataLoaded.fixedExpenses = true; checkLoadingDone();
         }, err => { console.error("Erro Fixed:", err); dataLoaded.fixedExpenses = true; checkLoadingDone(); });

        // Busca de Transações (Atualizada com flags)
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
                 if (listenersActive) { dataLoaded.transactions = true; checkLoadingDone(); } 
            }
        };
        fetchMonthlyTransactions();

        // Busca de Orçamentos (Budgets) para o mês do relatório
        const month = reportMonth.getMonth();
        const year = reportMonth.getFullYear();
        const budgetQuery = query(collection(db, 'budgets'), 
                                where('userId', '==', user.uid), 
                                where('month', '==', month), 
                                where('year', '==', year) );
        const unsubBudgets = onSnapshot(budgetQuery, (snap) => {
             if (listenersActive) { setBudgets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); dataLoaded.budgets = true; checkLoadingDone(); }
        }, (error) => {
            console.error("Erro ao buscar orçamentos (ReportPage):", error);
            if (listenersActive) { setBudgets([]); dataLoaded.budgets = true; checkLoadingDone(); }
        });

        // Busca de Metas (Goals) - todas do usuário
        const goalsQuery = query(collection(db, 'goals'), where('userId', '==', user.uid));
        const unsubGoals = onSnapshot(goalsQuery, (snap) => {
            if (listenersActive) {
                const fetchedGoals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedGoals.sort((a, b) => a.goalName.localeCompare(b.goalName)); 
                setGoals(fetchedGoals); dataLoaded.goals = true; checkLoadingDone(); 
            }
        }, (error) => {
            console.error("Erro ao buscar metas (ReportPage):", error);
             if (listenersActive) { setGoals([]); dataLoaded.goals = true; checkLoadingDone(); }
        });

        // Função de limpeza atualizada para incluir os novos listeners
        return () => { listenersActive = false; unsubCategories(); unsubFixedExpenses(); unsubBudgets(); unsubGoals(); };
    }, [user, reportMonth]); 
    
    // Efeito de Scroll (sem alteração)
    useEffect(() => { 
        const listElement = document.querySelector('.report-inner-list-container ul'); 
        if (listElement) { listElement.scrollTop = 0; }
     }, [reportDescriptionFilter, reportCategoryFilter]); 

    // Cálculos
    // 'allTransactionsForMonth' (sem alteração)
    const allTransactionsForMonth = useMemo(() => {
        if (!reportMonth) return [];
        const month = reportMonth.getMonth();
        const year = reportMonth.getFullYear();
        let monthTransactions = [...transactions]; 
        fixedExpenses.forEach(fixed => { 
             const paidVersionExists = monthTransactions.some(t => !t.isFixed && t.isPaid && t.description.toLowerCase().includes(fixed.description.toLowerCase()) && new Date(t.date).getDate() === fixed.dayOfMonth);
            // Adiciona gasto fixo APENAS se não existir uma versão paga E se for do tipo 'expense'
            if (!paidVersionExists) { 
                monthTransactions.push({
                    id: `fixed-${fixed.id}-${year}-${month}`, description: fixed.description, amount: fixed.amount,
                    date: new Date(year, month, fixed.dayOfMonth), type: 'expense', 
                    category: fixed.category, isPaid: false, isFixed: true,
                });
            }
         });
        return monthTransactions;
    }, [transactions, fixedExpenses, reportMonth]); 

    // 'reportCategoryFilterOptions' (sem alteração)
    const reportCategoryFilterOptions = useMemo(() => [ 
        ...categories.map(cat => ({ value: cat.name, label: cat.name })).sort((a, b) => a.label.localeCompare(b.label))
    ], [categories]);

    // 'filteredTransactions' (sem alteração)
    const filteredTransactions = useMemo(() => {
        if (!reportType) return [];
        // Filtra transações do mês E do tipo selecionado (income/expense)
        let baseList = allTransactionsForMonth.filter(t => t.type === reportType); 
        const descLower = reportDescriptionFilter.toLowerCase();
        const selectedCategoryNames = reportCategoryFilter ? reportCategoryFilter.map(opt => opt.value.toLowerCase()) : [];
        return baseList.filter(t => { 
             const descriptionMatch = t.description?.toLowerCase().includes(descLower) ?? true;
             const categoryMatch = selectedCategoryNames.length === 0 || selectedCategoryNames.includes(t.category?.toLowerCase());
             return descriptionMatch && categoryMatch;
        });
    }, [allTransactionsForMonth, reportType, reportDescriptionFilter, reportCategoryFilter]); 

    // Totais (Atualizado para usar 'allTransactionsForMonth')
    const { currentMonthIncomeTotal, currentMonthExpenseTotal, previousMonthIncomeTotal, previousMonthExpenseTotal } = useMemo(() => {
        let currentIncome = 0, currentExpense = 0;
        // Calcula totais do mês atual USANDO allTransactionsForMonth
        allTransactionsForMonth.forEach(t => { 
            if (t.type === 'income') currentIncome += t.amount; 
            else if (t.type === 'expense') currentExpense += t.amount; 
        });
        
        let previousIncome = 0, previousExpense = 0;
        previousMonthTransactions.forEach(t => { 
            if (t.type === 'income') previousIncome += t.amount; 
            else if (t.type === 'expense') previousExpense += t.amount; 
        });
        
        return { 
            currentMonthIncomeTotal: currentIncome, 
            currentMonthExpenseTotal: currentExpense, 
            previousMonthIncomeTotal: previousIncome, 
            previousMonthExpenseTotal: previousExpense 
        };
    }, [allTransactionsForMonth, previousMonthTransactions]); // Depende de allTransactionsForMonth agora

    // Dados dos Gráficos (Atualizado para usar 'allTransactionsForMonth')
    const chartData = useMemo(() => {
        if (!reportType) return [];
        // Gera dados do gráfico com base em TODAS as transações do mês
        return generateChartData(allTransactionsForMonth, reportType, categories); 
    }, [allTransactionsForMonth, reportType, categories]); // Depende de allTransactionsForMonth
    
    // Gráfico comparativo usa os TOTAIS já calculados
    const comparisonChartData = useMemo(() => {
        if (!reportMonth || !reportType) { 
            return [{ month: '', [reportType === 'income' ? 'Ganhos' : 'Gastos']: 0 }, { month: '', [reportType === 'income' ? 'Ganhos' : 'Gastos']: 0 }]; 
        }
        const previousMonthName = new Date(reportMonth.getFullYear(), reportMonth.getMonth() - 1).toLocaleString('pt-BR', { month: 'short' }); 
        const currentMonthName = reportMonth.toLocaleString('pt-BR', { month: 'short' }); 
        const dataKey = reportType === 'income' ? 'Ganhos' : 'Gastos';
        const previousValue = reportType === 'income' ? previousMonthIncomeTotal : previousMonthExpenseTotal;
        // Usa o total calculado que inclui gastos fixos para o mês atual
        const currentValue = reportType === 'income' ? currentMonthIncomeTotal : currentMonthExpenseTotal; 
        // Remove (Filt.) do label atual para clareza
        return [ { month: previousMonthName, [dataKey]: previousValue }, { month: currentMonthName, [dataKey]: currentValue }, ]; 
    }, [reportMonth, reportType, currentMonthIncomeTotal, currentMonthExpenseTotal, previousMonthIncomeTotal, previousMonthExpenseTotal]);

    // Cálculo de 'expensesByCategory' (Usa allTransactionsForMonth)
    const expensesByCategory = useMemo(() => {
        const monthlyExpenses = allTransactionsForMonth.filter(t => t.type === 'expense'); 
        return monthlyExpenses.reduce((acc, transaction) => { 
            const categoryName = transaction.category || 'Outros'; 
            acc[categoryName] = (acc[categoryName] || 0) + transaction.amount; 
            return acc; 
        }, {});
    }, [allTransactionsForMonth]); 


    const handleBack = () => navigate('/');

    // Função para trocar o tipo de relatório
    const handleSwitchReportType = () => {
        if (!reportMonth) return; // Segurança
        const oppositeType = reportType === 'income' ? 'expense' : 'income';
        navigate('/report', { 
            replace: true, 
            state: { reportType: oppositeType, reportMonth: reportMonth } 
        });
    };

    if (loading || !reportMonth) { 
        return ( <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados do relatório...</div> );
    }

    // Determina nomes e cores (Total agora usa os totais recalculados)
    const monthName = reportMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const title = reportType === 'income' ? 'Relatório de Ganhos' : 'Relatório de Gastos';
    const totalValue = reportType === 'income' ? currentMonthIncomeTotal : currentMonthExpenseTotal; // Usa o total correto
    const comparisonDataKey = reportType === 'income' ? 'Ganhos' : 'Gastos';
    const comparisonLineColor = reportType === 'income' ? 'var(--income-color)' : 'var(--expense-color)';
    const oppositeTypeName = reportType === 'income' ? 'Gastos' : 'Ganhos';
    const switchButtonClass = reportType === 'income' ? 'expense' : 'income'; 

    return (
        <div className="dashboard-container report-container">
            {/* Cabeçalho */}
            <header className="report-header">
                <button onClick={handleBack} className="signout-button report-back-button"> <FaArrowLeft style={{ marginRight: '8px' }} /> Voltar </button>
                <div className="report-title"> <h1>{title}</h1> <h2>{monthName}</h2> </div>
                {/* O total exibido agora reflete o total REAL do mês */}
                <div className={`report-total ${reportType}`}> <span>Total {reportType === 'income' ? 'Recebido' : 'Gasto'} (Mês Completo)</span> <strong className={reportType}> {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} </strong> </div>
            </header>

            {/* Botão de Troca */}
            <div className="report-switch-button-container">
                <button onClick={handleSwitchReportType} className={`report-switch-button ${switchButtonClass}`}>
                    <FaSyncAlt style={{ marginRight: '8px' }} /> Ver Relatório de {oppositeTypeName}
                </button>
            </div>


            {/* Gráficos Pizza e Barras */}
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

            {/* Gráfico Comparativo Linhas */}
            <div className="report-comparison-chart card-style">
                 <h3>Comparativo Mês Anterior ({comparisonDataKey})</h3>
                 {(comparisonChartData[0][comparisonDataKey] > 0 || comparisonChartData[1][comparisonDataKey] > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={comparisonChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(1)}k`} width={60} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} /> 
                            <Line 
                                type="monotone" 
                                dataKey={comparisonDataKey} 
                                name={comparisonDataKey} 
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

            {/* Container ÚNICO para Orçamentos e Metas */}
            {/* Adiciona card-style aqui e a classe report-summary-grid */}
            <div className="report-summary-grid card-style"> 
                {/* Remove o card-style das divs internas */}
                <div> 
                    <BudgetProgressList 
                        budgets={budgets} 
                        expensesByCategory={expensesByCategory} 
                    />
                </div>
                 <div> 
                    <GoalProgressList 
                        goals={goals} 
                        hideActions={true} 
                    />
                </div>
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
                    <TransactionList 
                        // A lista continua mostrando as transações filtradas pelo TIPO e pelos filtros do usuário
                        transactions={filteredTransactions.sort((a,b) => b.amount - a.amount)} 
                        categories={categories} 
                        onDeleteTransaction={() => {}} 
                        onEditTransaction={() => {}} 
                        onTogglePaid={() => {}}
                        isReadOnly={true} 
                    />
                </div>
            </div>

        </div>
    );
};

export default ReportPage;